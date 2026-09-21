import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type LeadPayload = {
  plan?: string;
  full_name?: string;
  email?: string;
  company?: string;
  phone?: string;
  website?: string;
  notes?: string;
  source?: string;
  captcha_token?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readString(value: unknown, max = 5000): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}



async function logAdminError(
  supabase: any,
  entry: {
    source: string;
    severity?: "info" | "warning" | "error" | "critical";
    code?: string;
    message: string;
    details?: Record<string, unknown>;
    userId?: string | null;
    reportId?: string | null;
    websiteUrl?: string | null;
  },
) {
  try {
    await supabase.from("admin_error_logs").insert({
      source: entry.source,
      severity: entry.severity ?? "error",
      code: entry.code ?? null,
      message: entry.message,
      details: entry.details ?? {},
      user_id: entry.userId ?? null,
      report_id: entry.reportId ?? null,
      website_url: entry.websiteUrl ?? null,
    });
  } catch (error) {
    console.error("admin error log insert failed", error);
  }
}


function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

type RateLimitRule = {
  action: string;
  identifier: string;
  identifierHint?: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit?: number;
  remaining?: number;
  retryAfterSeconds?: number;
};

async function checkRateLimit(supabase: any, rule: RateLimitRule): Promise<RateLimitResult> {
  const identifier = String(rule.identifier ?? "").trim().toLowerCase();
  if (!identifier) return { allowed: true };

  try {
    const identifierHash = await sha256Hex(`${rule.action}:${identifier}`);
    const since = new Date(Date.now() - rule.windowSeconds * 1000).toISOString();
    const { count, error } = await supabase
      .from("public_rate_limit_events")
      .select("id", { count: "exact", head: true })
      .eq("action", rule.action)
      .eq("identifier_hash", identifierHash)
      .gte("created_at", since);

    if (error) {
      console.error("rate limit lookup failed", error);
      return { allowed: true };
    }

    const used = count ?? 0;
    if (used >= rule.limit) {
      return { allowed: false, limit: rule.limit, remaining: 0, retryAfterSeconds: rule.windowSeconds };
    }

    await supabase.from("public_rate_limit_events").insert({
      action: rule.action,
      identifier_hash: identifierHash,
      identifier_hint: rule.identifierHint?.slice(0, 120) ?? null,
    });

    return { allowed: true, limit: rule.limit, remaining: Math.max(rule.limit - used - 1, 0) };
  } catch (error) {
    console.error("rate limit failed", error);
    return { allowed: true };
  }
}

async function checkRateLimits(supabase: any, rules: RateLimitRule[]): Promise<RateLimitResult> {
  for (const rule of rules) {
    const result = await checkRateLimit(supabase, rule);
    if (!result.allowed) return result;
  }
  return { allowed: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", message: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? "";
  const fromEmail = Deno.env.get("LEAD_FROM_EMAIL") ?? "Rankio <onboarding@resend.dev>";
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";

  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: "MISSING_SUPABASE_URL", message: "Missing SUPABASE_URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!serviceRoleKey) {
    return new Response(JSON.stringify({ error: "MISSING_SERVICE_ROLE_KEY", message: "Missing SERVICE_ROLE_KEY" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: LeadPayload;
  try {
    body = (await req.json()) as LeadPayload;
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_BODY", message: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const plan = readString(body.plan, 200) || "Unknown plan";
  const fullName = readString(body.full_name, 200);
  const email = readString(body.email, 320);
  const company = readString(body.company, 200);
  const phone = readString(body.phone, 50);
  const website = readString(body.website, 500);
  const notes = readString(body.notes, 5000);
  const source = readString(body.source, 200);
  const captchaToken = readString(body.captcha_token, 5000);

  if (!email) {
    return new Response(JSON.stringify({ error: "EMAIL_REQUIRED", message: "Email is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "INVALID_EMAIL", message: "Invalid email" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const rateLimit = await checkRateLimits(supabase, [
    { action: "lead:ip", identifier: getClientIp(req), identifierHint: "ip", limit: 10, windowSeconds: 60 * 60 },
    { action: "lead:email", identifier: email, identifierHint: email, limit: 5, windowSeconds: 60 * 60 },
  ]);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      error: "RATE_LIMITED",
      message: "Too many plan enquiries were submitted. Please try again later.",
      limit: rateLimit.limit,
      retry_after_seconds: rateLimit.retryAfterSeconds,
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (turnstileSecret) {
    if (!captchaToken) {
      return new Response(JSON.stringify({ error: "CAPTCHA_REQUIRED", message: "CAPTCHA is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const form = new URLSearchParams();
    form.set("secret", turnstileSecret);
    form.set("response", captchaToken);

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!verifyRes.ok) {
      return new Response(JSON.stringify({ error: "CAPTCHA_VERIFY_FAILED", message: "Failed to verify CAPTCHA" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const verifyJson = (await verifyRes.json().catch(() => null)) as any;
    if (!verifyJson?.success) {
      return new Response(JSON.stringify({ error: "CAPTCHA_INVALID", message: "Invalid CAPTCHA" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  const createdAt = new Date().toISOString();
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  let userId: string | null = null;
  if (accessToken) {
    const { data: authUser } = await supabase.auth.getUser(accessToken);
    userId = authUser?.user?.id ?? null;
  }

  const { data: leadRow, error: leadErr } = await supabase
    .from("leads")
    .insert({
      user_id: userId,
      plan,
      full_name: fullName || null,
      email,
      company: company || null,
      phone: phone || null,
      website: website || null,
      notes: notes || null,
      source: source || null,
    })
    .select("id")
    .single();

  if (leadErr) {
    await logAdminError(supabase, {
      source: "lead-notify",
      severity: "error",
      code: "LEAD_INSERT_FAILED",
      message: "Failed to save lead",
      details: { error: leadErr.message, email, plan, source },
      userId,
      websiteUrl: website || null,
    });
    return new Response(
      JSON.stringify({ error: "LEAD_INSERT_FAILED", message: "We couldn't save your request right now. Please try again in a few minutes." }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const leadId = String((leadRow as any)?.id ?? "").trim();
  const subject = `Rankio lead: ${plan}`;

  const lines = [
    `Lead ID: ${leadId || "-"}`,
    `Plan: ${plan}`,
    `Name: ${fullName || "-"}`,
    `Email: ${email}`,
    `Company: ${company || "-"}`,
    `Phone: ${phone || "-"}`,
    `Website: ${website || "-"}`,
    `Source: ${source || "-"}`,
    `Submitted: ${createdAt}`,
    "",
    "Notes:",
    notes || "-",
  ];

  const text = lines.join("\n");
  const html = lines
    .map((l) => l.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"))
    .join("<br/>");

  if (!resendKey || !adminEmail) {
    await logAdminError(supabase, {
      source: "lead-notify",
      severity: "critical",
      code: !adminEmail ? "MISSING_ADMIN_EMAIL" : "MISSING_RESEND_API_KEY",
      message: !adminEmail ? "Lead admin email is not configured" : "Resend API key is not configured for lead emails",
      details: { lead_id: leadId, email, plan, has_resend_key: Boolean(resendKey), has_admin_email: Boolean(adminEmail) },
      userId,
      websiteUrl: website || null,
    });
    return new Response(JSON.stringify({ ok: true, lead_id: leadId, email_sent: false, email_error: !adminEmail ? "MISSING_ADMIN_EMAIL" : "MISSING_RESEND_API_KEY" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [adminEmail],
      subject,
      text,
      html,
      reply_to: email,
    }),
  });

  if (!resendRes.ok) {
    const details = await resendRes.text().catch(() => "");
    await logAdminError(supabase, {
      source: "lead-notify",
      severity: "error",
      code: "EMAIL_SEND_FAILED",
      message: "Lead was saved, but admin email failed",
      details: { lead_id: leadId, status: resendRes.status, email_error: details },
      userId,
      websiteUrl: website || null,
    });
    return new Response(JSON.stringify({ ok: true, lead_id: leadId, email_sent: false, email_error: details }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ ok: true, lead_id: leadId, email_sent: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
