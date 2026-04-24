import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
  if (!accessToken) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const { data: authUser } = await supabase.auth.getUser(accessToken);
  const userId = authUser?.user?.id ?? null;
  if (!userId) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  let visitorId: string | null = null;
  try {
    const body = await req.json();
    const candidate = String(body.visitor_id ?? "").trim();
    visitorId = candidate && isUuid(candidate) ? candidate : null;
  } catch {
    return new Response("Invalid body", { status: 400, headers: corsHeaders });
  }

  if (!visitorId) {
    return new Response("visitor_id is required", { status: 400, headers: corsHeaders });
  }

  const { data: guestSites, error: sitesErr } = await supabase
    .from("websites")
    .select("id, normalized_url")
    .eq("visitor_id", visitorId)
    .is("user_id", null)
    .limit(500);

  if (sitesErr) {
    console.error("guest websites lookup error", sitesErr);
    return new Response("Failed to claim", { status: 500, headers: corsHeaders });
  }

  let claimed = 0;
  let merged = 0;

  for (const site of guestSites ?? []) {
    const normalizedUrl = String((site as any).normalized_url ?? "").trim();
    const siteId = String((site as any).id ?? "").trim();
    if (!siteId || !normalizedUrl) continue;

    const { data: userSite, error: userSiteErr } = await supabase
      .from("websites")
      .select("id")
      .eq("user_id", userId)
      .eq("normalized_url", normalizedUrl)
      .limit(1)
      .maybeSingle();

    if (userSiteErr) {
      console.error("user website lookup error", userSiteErr);
      continue;
    }

    if (userSite?.id) {
      const { error: moveErr } = await supabase
        .from("reports")
        .update({ website_id: userSite.id, visitor_id: null })
        .eq("website_id", siteId);

      if (moveErr) {
        console.error("move reports error", moveErr);
        continue;
      }

      const { error: delErr } = await supabase.from("websites").delete().eq("id", siteId);
      if (delErr) {
        console.error("delete guest website error", delErr);
        continue;
      }

      merged++;
      continue;
    }

    const { error: claimErr } = await supabase
      .from("websites")
      .update({ user_id: userId, visitor_id: null })
      .eq("id", siteId);

    if (claimErr) {
      console.error("claim website error", claimErr);
      continue;
    }

    claimed++;
  }

  return new Response(JSON.stringify({ claimed, merged }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});

