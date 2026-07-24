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
