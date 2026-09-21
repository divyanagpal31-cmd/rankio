import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);
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

  if (!serviceRoleKey) {
    return new Response("Missing service role key", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  let userId: string | null = null;
  if (accessToken) {
    const { data: authUser } = await supabase.auth.getUser(accessToken);
    userId = authUser?.user?.id ?? null;
  }

  let scanJobId: string | null = null;
  let visitorId: string | null = null;
  try {
    const body = await req.json();
    const scanCandidate = String(body.scan_job_id ?? "").trim();
    scanJobId = scanCandidate && isUuid(scanCandidate) ? scanCandidate : null;
    const visitorCandidate = String(body.visitor_id ?? "").trim();
    visitorId = visitorCandidate && isUuid(visitorCandidate) ? visitorCandidate : null;
  } catch {
    return new Response("Invalid body", { status: 400, headers: corsHeaders });
  }

  if (!scanJobId) {
    return new Response("scan_job_id is required", { status: 400, headers: corsHeaders });
  }

  const rateLimit = await checkRateLimits(supabase, [
    { action: "cancel-scan:ip", identifier: getClientIp(req), identifierHint: "ip", limit: 60, windowSeconds: 60 * 60 },
    { action: "cancel-scan:owner", identifier: userId ? `user:${userId}` : visitorId ? `visitor:${visitorId}` : getClientIp(req), identifierHint: userId ? "user" : visitorId ? "visitor" : "ip", limit: 40, windowSeconds: 60 * 60 },
  ]);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({ error: "RATE_LIMITED", message: "Too many scan cancellation requests. Please try again later." }), {
      status: 429,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  await supabase
    .from("scan_cancellations")
    .upsert({
      scan_job_id: scanJobId,
      user_id: userId,
      visitor_id: userId ? null : visitorId,
      created_at: new Date().toISOString(),
    });

  const ownerFilter = userId
    ? { user_id: userId }
    : visitorId
      ? { visitor_id: visitorId }
      : null;

  if (ownerFilter) {
    let updateQuery = supabase
      .from("scan_jobs")
      .update({
        status: "canceled",
        progress: 100,
        error_code: "SCAN_CANCELED",
        error_message: "Scan stopped by user",
        completed_at: new Date().toISOString(),
      })
      .eq("id", scanJobId)
      .in("status", ["queued", "running"]);

    if ("user_id" in ownerFilter) updateQuery = updateQuery.eq("user_id", ownerFilter.user_id);
    if ("visitor_id" in ownerFilter) updateQuery = updateQuery.eq("visitor_id", ownerFilter.visitor_id);

    await updateQuery;
  }

  return new Response(JSON.stringify({ status: "canceled" }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
