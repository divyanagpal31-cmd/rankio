import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CallbackPayload = {
  full_name?: string;
  email?: string;
  country?: string;
  phone?: string;
  company?: string;
  requirements?: string;
  website_url?: string;
  report_id?: string;
  scan_scope?: string;
  source_url?: string;
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

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
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

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return /^\+?[0-9 ()-]{7,20}$/.test(trimmed) && digits.length >= 7 && digits.length <= 15;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "METHOD_NOT_ALLOWED", message: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const adminEmail = Deno.env.get("ADMIN_EMAIL") ?? "";
  const fromEmail = Deno.env.get("LEAD_FROM_EMAIL") ?? "Rankio <onboarding@resend.dev>";
  const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";

  if (!supabaseUrl) return jsonResponse({ error: "MISSING_SUPABASE_URL", message: "Missing SUPABASE_URL" }, 500);
  if (!serviceRoleKey) return jsonResponse({ error: "MISSING_SERVICE_ROLE_KEY", message: "Missing SERVICE_ROLE_KEY" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: CallbackPayload;
  try {
    body = (await req.json()) as CallbackPayload;
  } catch {
    return jsonResponse({ error: "INVALID_BODY", message: "Invalid body" }, 400);
  }

  const fullName = readString(body.full_name, 200);
  const email = readString(body.email, 320).toLowerCase();
  const country = readString(body.country, 120);
  const phone = readString(body.phone, 40);
  const company = readString(body.company, 200);
  const requirements = readString(body.requirements, 2500);
  const websiteUrl = readString(body.website_url, 500);
  const reportIdRaw = readString(body.report_id, 80);
  const scanScope = readString(body.scan_scope, 80);
  const sourceUrl = readString(body.source_url, 800);
  const captchaToken = readString(body.captcha_token, 5000);

  if (!fullName) return jsonResponse({ error: "FULL_NAME_REQUIRED", message: "Name is required" }, 400);
  if (fullName.length < 2) return jsonResponse({ error: "FULL_NAME_TOO_SHORT", message: "Name must be at least 2 characters" }, 400);
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(fullName)) return jsonResponse({ error: "FULL_NAME_INVALID", message: "Name can include letters, spaces, apostrophes, periods, and hyphens" }, 400);
  if (!email) return jsonResponse({ error: "EMAIL_REQUIRED", message: "Email is required" }, 400);
  if (!isValidEmail(email)) return jsonResponse({ error: "INVALID_EMAIL", message: "Enter a valid email address" }, 400);
  if (!country) return jsonResponse({ error: "COUNTRY_REQUIRED", message: "Country is required" }, 400);
  if (country.length < 2) return jsonResponse({ error: "COUNTRY_TOO_SHORT", message: "Country must be at least 2 characters" }, 400);
  if (!phone) return jsonResponse({ error: "PHONE_REQUIRED", message: "Phone number is required" }, 400);
  if (!isValidPhone(phone)) return jsonResponse({ error: "INVALID_PHONE", message: "Enter a valid phone number" }, 400);
  if (company.length > 200) return jsonResponse({ error: "COMPANY_TOO_LONG", message: "Company must be 200 characters or less" }, 400);
  if (!requirements) return jsonResponse({ error: "REQUIREMENTS_REQUIRED", message: "Requirements are required" }, 400);
  if (requirements.length < 20) return jsonResponse({ error: "REQUIREMENTS_TOO_SHORT", message: "Requirements must be at least 20 characters" }, 400);

  if (turnstileSecret) {
    if (!captchaToken) return jsonResponse({ error: "CAPTCHA_REQUIRED", message: "Please complete the CAPTCHA verification" }, 400);

    const form = new URLSearchParams();
    form.set("secret", turnstileSecret);
    form.set("response", captchaToken);

    const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!verifyRes.ok) return jsonResponse({ error: "CAPTCHA_VERIFY_FAILED", message: "We couldn't verify the CAPTCHA. Please try again." }, 502);

    const verifyJson = (await verifyRes.json().catch(() => null)) as any;
    if (!verifyJson?.success) return jsonResponse({ error: "CAPTCHA_INVALID", message: "CAPTCHA verification failed. Please try again." }, 400);
  }

  const normalizedWebsite = normalizeWebsiteUrl(websiteUrl);
  if (websiteUrl && !normalizedWebsite) return jsonResponse({ error: "INVALID_WEBSITE_URL", message: "Invalid website URL" }, 400);
  const reportId = reportIdRaw && isUuid(reportIdRaw) ? reportIdRaw : null;

  const rateLimit = await checkRateLimits(supabase, [
    { action: "callback:ip", identifier: getClientIp(req), identifierHint: "ip", limit: 10, windowSeconds: 60 * 60 },
    { action: "callback:email", identifier: email, identifierHint: email, limit: 3, windowSeconds: 60 * 60 },
  ]);
  if (!rateLimit.allowed) {
    return jsonResponse({
      error: "RATE_LIMITED",
      message: "Too many callback requests were submitted. Please try again later.",
      limit: rateLimit.limit,
      retry_after_seconds: rateLimit.retryAfterSeconds,
    }, 429);
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  let userId: string | null = null;
  if (accessToken) {
    const { data: authUser } = await supabase.auth.getUser(accessToken);
    userId = authUser?.user?.id ?? null;
  }

  const createdAt = new Date().toISOString();
  const { data: requestRow, error: insertErr } = await supabase
    .from("callback_requests")
    .insert({
      user_id: userId,
      report_id: reportId,
      full_name: fullName,
      email,
      country,
      phone,
      company: company || null,
      requirements,
      website_url: normalizedWebsite || null,
      scan_scope: scanScope || null,
      source_url: sourceUrl || null,
    })
    .select("id")
    .single();

  if (insertErr) {
    await logAdminError(supabase, {
      source: "callback-notify",
      severity: "error",
      code: "CALLBACK_INSERT_FAILED",
      message: "Failed to save callback request",
      details: { error: insertErr.message, email, website_url: normalizedWebsite || null },
      userId,
      reportId,
      websiteUrl: normalizedWebsite || null,
    });
    return jsonResponse({ error: "CALLBACK_INSERT_FAILED", message: "We couldn't save your callback request right now. Please try again in a few minutes." }, 500);
  }

  const requestId = String((requestRow as any)?.id ?? "").trim();

  if (!resendKey || !adminEmail) {
    await logAdminError(supabase, {
      source: "callback-notify",
      severity: "critical",
      code: !adminEmail ? "MISSING_ADMIN_EMAIL" : "MISSING_RESEND_API_KEY",
      message: !adminEmail ? "Callback admin email is not configured" : "Resend API key is not configured for callback emails",
      details: { request_id: requestId, email, has_resend_key: Boolean(resendKey), has_admin_email: Boolean(adminEmail) },
      userId,
      reportId,
      websiteUrl: normalizedWebsite || null,
    });
    return jsonResponse({ ok: true, request_id: requestId, email_sent: false, email_error: !adminEmail ? "MISSING_ADMIN_EMAIL" : "MISSING_RESEND_API_KEY" });
  }

  const subject = `Rankio callback request: ${fullName}`;
  const text = [
    "Rankio Callback Request",
    `Submitted: ${createdAt}`,
    "",
    `Name: ${fullName}`,
    `Email: ${email}`,
    `Country: ${country}`,
    `Phone: ${phone}`,
    `Company: ${company || "-"}`,
    `Website: ${normalizedWebsite || "-"}`,
    `Report ID: ${reportId || "-"}`,
    `Scan Scope: ${scanScope || "-"}`,
    `Source URL: ${sourceUrl || "-"}`,
    "",
    "Requirements:",
    requirements,
  ].join("\n");

  const details = [
    ["Name", fullName],
    ["Email", email],
    ["Country", country],
    ["Phone", phone],
    ["Company", company || "-"],
    ["Website", normalizedWebsite || "-"],
    ["Report ID", reportId || "-"],
    ["Scan Scope", scanScope || "-"],
    ["Source URL", sourceUrl || "-"],
  ];

  const detailRows = details.map(([label, value]) => `
    <tr>
      <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:700;width:34%;">${escapeHtml(label)}</td>
      <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;font-weight:600;word-break:break-word;">${escapeHtml(value)}</td>
    </tr>`).join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3f6fb;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;border-collapse:collapse;">
<tr><td style="background:linear-gradient(135deg,#0b1027 0%,#4f46e5 100%);padding:28px 32px;border-radius:20px 20px 0 0;">
<div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#dbe4ff;font-weight:700;">Rankio Callback Request</div>
<div style="margin-top:10px;font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;">New callback request</div>
<div style="margin-top:8px;font-size:14px;line-height:1.7;color:#eef2ff;">A report viewer requested a callback from the implementation CTA.</div>
</td></tr>
<tr><td style="background:#ffffff;padding:28px 32px;border-left:1px solid #d9e2f1;border-right:1px solid #d9e2f1;border-bottom:1px solid #d9e2f1;border-radius:0 0 20px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">${detailRows}</table>
<div style="margin-top:18px;background:#f8faff;border:1px solid #dbe3f1;border-radius:16px;padding:18px 20px;">
<div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Requirements</div>
<div style="margin-top:10px;font-size:15px;line-height:1.8;color:#334155;">${escapeHtml(requirements).replace(/\n/g, "<br/>")}</div>
</div>
<div style="padding-top:18px;font-size:12px;line-height:1.6;color:#64748b;">Submitted: ${escapeHtml(createdAt)}</div>
</td></tr></table></td></tr></table></body></html>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromEmail, to: [adminEmail], subject, text, html, reply_to: email }),
  });

  if (!resendRes.ok) {
    const emailError = await resendRes.text().catch(() => "");
    await logAdminError(supabase, {
      source: "callback-notify",
      severity: "error",
      code: "EMAIL_SEND_FAILED",
      message: "Callback request was saved, but admin email failed",
      details: { request_id: requestId, status: resendRes.status, email_error: emailError },
      userId,
      reportId,
      websiteUrl: normalizedWebsite || null,
    });
    return jsonResponse({ ok: true, request_id: requestId, email_sent: false, email_error: emailError });
  }

  return jsonResponse({ ok: true, request_id: requestId, email_sent: true, submitted_at: createdAt });
});