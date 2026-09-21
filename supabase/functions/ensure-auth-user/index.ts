import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const metadata = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(metadata).filter(([key, entry]) => key.length <= 64 && typeof entry !== "undefined")
  );
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

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "METHOD_NOT_ALLOWED", message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error: "MISSING_SUPABASE_CONFIG",
        message: "Missing SUPABASE_URL or service role key",
      },
      500
    );
  }

  let payload: { email?: unknown; data?: unknown };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "INVALID_BODY", message: "Invalid JSON body" }, 400);
  }

  const email = String(payload.email ?? "").trim().toLowerCase();
  if (!isValidEmail(email)) {
    return jsonResponse({ error: "INVALID_EMAIL", message: "A valid email is required" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const rateLimit = await checkRateLimits(supabase, [
    { action: "auth-helper:ip", identifier: getClientIp(req), identifierHint: "ip", limit: 20, windowSeconds: 15 * 60 },
    { action: "auth-helper:email", identifier: email, identifierHint: email, limit: 5, windowSeconds: 15 * 60 },
  ]);
  if (!rateLimit.allowed) {
    return jsonResponse({
      error: "RATE_LIMITED",
      message: "Too many login requests were made. Please wait a few minutes and try again.",
      limit: rateLimit.limit,
      retry_after_seconds: rateLimit.retryAfterSeconds,
    }, 429);
  }

  const { data: createdUser, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: readMetadata(payload.data),
  });

  if (error) {
    const message = error.message.toLowerCase();
    const status = typeof error.status === "number" ? error.status : 500;
    const userAlreadyExists = status === 422 && /already|registered|exists/.test(message);

    if (!userAlreadyExists) {
      return jsonResponse({ error: "CREATE_USER_FAILED", message: error.message }, status);
    }

    return jsonResponse({ ok: true, created: false });
  }

  return jsonResponse({ ok: true, created: Boolean(createdUser.user) });
});
