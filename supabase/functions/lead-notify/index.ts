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
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readString(value: unknown, max = 5000): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
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
  const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? "divya.nagpal31@gmail.com";
  const fromEmail = Deno.env.get("LEAD_FROM_EMAIL") ?? "Rankio <onboarding@resend.dev>";

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
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "MISSING_RESEND_API_KEY", message: "Missing RESEND_API_KEY" }), {
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
    return new Response(
      JSON.stringify({ error: "LEAD_INSERT_FAILED", message: "Failed to save lead", details: leadErr.message }),
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
    // Lead is saved already; don't block the user on email delivery issues.
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
