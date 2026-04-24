import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const scanVersion = "2026-04-24-visitor-claim-1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-rankio-scan-version",
  "x-rankio-scan-version": scanVersion,
};

type ReportRow = {
  id: string;
  website_id: string;
  status: string;
  ai_score?: number;
  performance_score?: number;
  seo_score?: number;
  technical_score?: number;
  raw_scan_data?: unknown;
  ai_summary?: string;
  recommendations?: unknown;
  generated_at?: string;
};

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  const url = new URL(u);
  url.hash = "";
  if (url.pathname === "/") url.pathname = "";
  return url.toString().replace(/\/$/, "");
}

function stripMarkdownLinks(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

type Recommendation = {
  title: string;
  severity: "High" | "Medium" | "Good" | "Info";
  description: string;
  recommendation: string;
  category?: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toSeverityFromScore(score: unknown): Recommendation["severity"] {
  if (typeof score !== "number") return "Info";
  if (score < 0.5) return "High";
  if (score < 0.9) return "Medium";
  return "Good";
}

function formatSavingsMs(ms?: unknown): string {
  const n = typeof ms === "number" ? ms : 0;
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${Math.round(n)}ms`;
}

function formatSavingsBytes(bytes?: unknown): string {
  const n = typeof bytes === "number" ? bytes : 0;
  if (!Number.isFinite(n) || n <= 0) return "";
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function buildRecommendations(psiJson: any): Recommendation[] {
  const audits = psiJson?.lighthouseResult?.audits ?? {};
  const categories = psiJson?.lighthouseResult?.categories ?? {};
  const out: Recommendation[] = [];

  const addAudit = (auditId: string, category: string) => {
    const audit = audits?.[auditId];
    if (!audit) return;
    const title = String(audit.title ?? "").trim();
    const descriptionRaw = String(audit.description ?? "").trim();
    if (!title) return;

    const severity = toSeverityFromScore(audit.score);
    const overallSavingsMs = audit?.details?.overallSavingsMs;
    const overallSavingsBytes = audit?.details?.overallSavingsBytes;
    const savingsMs = formatSavingsMs(overallSavingsMs);
    const savingsBytes = formatSavingsBytes(overallSavingsBytes);

    const savingsParts = [savingsMs && `time ${savingsMs}`, savingsBytes && `size ${savingsBytes}`].filter(Boolean);
    const savingsSuffix = savingsParts.length ? `Potential savings: ${savingsParts.join(", ")}.` : "";

    const description = stripMarkdownLinks(descriptionRaw);
    const recommendation =
      savingsSuffix ? `${savingsSuffix} ${title}.` : title;

    out.push({
      title,
      severity,
      description,
      recommendation,
      category,
    });
  };

  // Performance: prioritize real "opportunity" audits with savings.
  const perfAuditRefs: any[] = categories?.performance?.auditRefs ?? [];
  const perfOpportunities = perfAuditRefs
    .map((r) => String(r.id ?? ""))
    .filter(Boolean)
    .map((id) => ({ id, audit: audits?.[id] }))
    .filter((x) => x.audit?.details?.type === "opportunity")
    .sort((a, b) => (b.audit?.details?.overallSavingsMs ?? 0) - (a.audit?.details?.overallSavingsMs ?? 0))
    .slice(0, 5);

  for (const item of perfOpportunities) addAudit(item.id, "Performance");

  // SEO / Best Practices: take failing audits (score < 0.9) to keep it actionable.
  const pushFailing = (categoryKey: "seo" | "best-practices", label: string, limit: number) => {
    const refs: any[] = categories?.[categoryKey]?.auditRefs ?? [];
    const ids = refs
      .map((r) => String(r.id ?? ""))
      .filter(Boolean)
      .filter((id) => {
        const a = audits?.[id];
        return typeof a?.score === "number" && a.score < 0.9 && a.scoreDisplayMode === "numeric";
      })
      .slice(0, limit);
    for (const id of ids) addAudit(id, label);
  };

  pushFailing("seo", "SEO", 3);
  pushFailing("best-practices", "Best Practices", 3);

  // If nothing was found, return an empty list (UI falls back to demo insights).
  return out;
}

function hasAllCategoryScores(rawScanData: any): boolean {
  const categories = rawScanData?.lighthouseResult?.categories;
  const keys = ["performance", "seo", "best-practices", "accessibility"];
  return keys.every((key) => typeof categories?.[key]?.score === "number");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
  const psiKey = Deno.env.get("PAGESPEED_API_KEY");

  if (!serviceRoleKey) {
    return new Response("Missing service role key", { status: 500, headers: corsHeaders });
  }
  if (!psiKey) {
    return new Response("Missing PageSpeed API key", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // capture user if provided
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  let userId: string | null = null;
  if (accessToken) {
    const { data: authUser } = await supabase.auth.getUser(accessToken);
    userId = authUser?.user?.id ?? null;
  }

  let url: string;
  let visitorId: string | null = null;
  try {
    const body = await req.json();
    url = String(body.url ?? "");
    const candidate = String(body.visitor_id ?? "").trim();
    visitorId = candidate && isUuid(candidate) ? candidate : null;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!url) {
    return new Response(JSON.stringify({ error: "url is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!userId && !visitorId) {
    return new Response(JSON.stringify({ error: "visitor_id is required for guests" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(url);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  const freshSince = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  const nowIso = new Date().toISOString();

  // Find or create an owner-specific website row (user_id OR visitor_id).
  const websiteQuery = supabase
    .from("websites")
    .select("*")
    .eq("normalized_url", normalized)
    .limit(1);

  const { data: existing, error: existingErr } = userId
    ? await websiteQuery.eq("user_id", userId).maybeSingle()
    : await websiteQuery.eq("visitor_id", visitorId).maybeSingle();

  let site = existing;

  if (!site) {
    const { data: inserted, error: insertErr } = await supabase
      .from("websites")
      .insert({
        normalized_url: normalized,
        url,
        user_id: userId,
        visitor_id: userId ? null : visitorId,
        created_at: nowIso,
        last_scanned_at: nowIso,
      })
      .select()
      .single();
    if (insertErr || !inserted) {
      console.error("website insert error", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to upsert website", details: insertErr?.message ?? null }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    site = inserted;
  } else {
    await supabase
      .from("websites")
      .update({ last_scanned_at: nowIso, url })
      .eq("id", site.id);
  }

  // If lookup failed due to some unexpected error
  if (existingErr) {
    console.error("website lookup error", existingErr);
  }

  // Use any cached completed report for this normalized URL (across any website row),
  // but return an owner-specific report row so RLS/ownership works correctly.
  const { data: cached } = await supabase
    .from("reports")
    .select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, ai_summary, recommendations, generated_at, websites!inner(normalized_url)")
    .eq("status", "completed")
    .gt("generated_at", freshSince)
    .eq("websites.normalized_url", normalized)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached && hasAllCategoryScores((cached as any).raw_scan_data)) {
    if ((cached as any).website_id === site.id) {
      const { websites: _w, ...rest } = cached as any;
      return new Response(JSON.stringify(rest), { headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { websites: _w, id: _id, website_id: _wid, generated_at: _ga, ...rest } = cached as any;
    const insertPayload = {
      ...rest,
      website_id: site.id,
      generated_at: nowIso,
      visitor_id: userId ? null : visitorId,
    };

    const { data: cloned, error: cloneErr } = await supabase
      .from("reports")
      .insert(insertPayload)
      .select()
      .single();

    if (cloneErr || !cloned) {
      console.error("clone report error", cloneErr);
      return new Response(
        JSON.stringify({ error: "Failed to save report", details: cloneErr?.message ?? null }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    return new Response(JSON.stringify(cloned), { headers: { "Content-Type": "application/json", ...corsHeaders } });
  }

  // Explicitly request all Lighthouse categories. Some PSI responses may omit
  // non-requested categories which would otherwise appear as 0 in the UI.
  const psiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(normalized)}` +
    `&strategy=mobile` +
    `&category=performance` +
    `&category=seo` +
    `&category=best-practices` +
    `&category=accessibility` +
    `&key=${psiKey}`;
  const psiRes = await fetch(psiUrl);
  if (!psiRes.ok) {
    console.error("PSI failed", await psiRes.text());
    return new Response("PageSpeed request failed", { status: 502, headers: corsHeaders });
  }
  const psiJson = await psiRes.json();

  const perf = Math.round((psiJson?.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
  const seo = Math.round((psiJson?.lighthouseResult?.categories?.seo?.score ?? 0) * 100);
  const best = Math.round((psiJson?.lighthouseResult?.categories?.["best-practices"]?.score ?? 0) * 100);
  const a11y = Math.round((psiJson?.lighthouseResult?.categories?.accessibility?.score ?? 0) * 100);
  const weights = { perf: 0.4, seo: 0.3, best: 0.2, a11y: 0.1 };
  const ai = Math.round(perf * weights.perf + seo * weights.seo + best * weights.best + a11y * weights.a11y);

  const recommendations = buildRecommendations(psiJson);
  const aiSummary = stripMarkdownLinks(
    `AI readiness score ${ai}/100 based on Performance ${perf}, SEO ${seo}, Best Practices ${best}, Accessibility ${a11y}.`
  );

  const insertPayload = {
    website_id: site.id,
    status: "completed",
    performance_score: perf,
    seo_score: seo,
    technical_score: best,
    ai_score: ai,
    raw_scan_data: psiJson,
    ai_summary: aiSummary,
    recommendations: recommendations.length ? recommendations : null,
    generated_at: nowIso,
    visitor_id: userId ? null : visitorId,
  };

  const { data: report, error: repErr } = await supabase.from("reports").insert(insertPayload).select().single();

  if (repErr || !report) {
    console.error("insert report error", repErr);
    return new Response(
      JSON.stringify({ error: "Failed to save report", details: repErr?.message ?? null }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  return new Response(JSON.stringify(report as ReportRow), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
