import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ContactPayload = {
  full_name?: string;
  email?: string;
  website_url?: string;
  reason?: string;
  message?: string;
  source?: string;
  captcha_token?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasNoDigits(value: string): boolean {
  return !/\d/.test(value);
}

function readString(value: unknown, max = 5000): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
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

const validReasons = new Set([
  "Report Support",
  "Billing & Payment",
  "Technical Issue",
  "Partnership",
  "Agency / Bulk Reports",
  "General Enquiry",
]);


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

  let body: ContactPayload;
  try {
    body = (await req.json()) as ContactPayload;
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_BODY", message: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const fullName = readString(body.full_name, 200);
  const email = readString(body.email, 320);
  const websiteUrl = readString(body.website_url, 500);
  const reason = readString(body.reason, 200);
  const message = readString(body.message, 2000);
  const source = readString(body.source, 200) || "contact-page";
  const captchaToken = readString(body.captcha_token, 5000);

  if (!fullName) {
    return new Response(JSON.stringify({ error: "FULL_NAME_REQUIRED", message: "Full name is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (fullName.length < 2) {
    return new Response(JSON.stringify({ error: "FULL_NAME_TOO_SHORT", message: "Full name must be at least 2 characters" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!hasNoDigits(fullName)) {
    return new Response(JSON.stringify({ error: "FULL_NAME_NUMBERS_NOT_ALLOWED", message: "Full name cannot contain numbers" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!/^[A-Za-z][A-Za-z\s'.-]*$/.test(fullName)) {
    return new Response(
      JSON.stringify({
        error: "FULL_NAME_INVALID_CHARACTERS",
        message: "Full name can only include letters, spaces, apostrophes, periods, and hyphens",
      }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
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
  const normalizedWebsite = normalizeWebsiteUrl(websiteUrl);
  if (websiteUrl && !normalizedWebsite) {
    return new Response(JSON.stringify({ error: "INVALID_WEBSITE_URL", message: "Invalid website URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!reason) {
    return new Response(JSON.stringify({ error: "REASON_REQUIRED", message: "Reason is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!validReasons.has(reason)) {
    return new Response(JSON.stringify({ error: "INVALID_REASON", message: "Invalid reason" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!message) {
    return new Response(JSON.stringify({ error: "MESSAGE_REQUIRED", message: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (message.length < 10) {
    return new Response(JSON.stringify({ error: "MESSAGE_TOO_SHORT", message: "Message must be at least 10 characters" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const rateLimit = await checkRateLimits(supabase, [
    { action: "contact:ip", identifier: getClientIp(req), identifierHint: "ip", limit: 10, windowSeconds: 60 * 60 },
    { action: "contact:email", identifier: email, identifierHint: email, limit: 5, windowSeconds: 60 * 60 },
  ]);
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify({
      error: "RATE_LIMITED",
      message: "Too many contact messages were submitted. Please try again later.",
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

  const { data: contactRow, error: contactErr } = await supabase
    .from("contact_messages")
    .insert({
      user_id: userId,
      full_name: fullName,
      email,
      website_url: normalizedWebsite || null,
      reason,
      message,
      source: source || null,
    })
    .select("id")
    .single();

  if (contactErr) {
    await logAdminError(supabase, {
      source: "contact-notify",
      severity: "error",
      code: "CONTACT_INSERT_FAILED",
      message: "Failed to save contact message",
      details: { error: contactErr.message, email, reason, source },
      userId,
      websiteUrl: normalizedWebsite || null,
    });
    return new Response(
      JSON.stringify({
        error: "CONTACT_INSERT_FAILED",
        message: "We couldn't save your message right now. Please try again in a few minutes.",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const contactId = String((contactRow as any)?.id ?? "").trim();
  const subject = `Rankio contact form: ${reason}`;

  const text = [
    `Rankio Contact Form`,
    `Submitted: ${createdAt}`,
    ``,
    `Full Name: ${fullName}`,
    `Work Email: ${email}`,
    `Website URL: ${normalizedWebsite || "-"}`,
    `Reason: ${reason}`,
    ``,
    `Message:`,
    message,
  ].join("\n");

  const safeName = escapeHtml(fullName);
  const safeEmail = escapeHtml(email);
  const safeWebsite = escapeHtml(normalizedWebsite || "-");
  const safeReason = escapeHtml(reason);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");
  const safeSubmitted = escapeHtml(createdAt);

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Rankio Contact Submission</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      New contact form submission from Rankio
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f3f6fb;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;border-collapse:collapse;">
            <tr>
              <td style="background:linear-gradient(135deg,#0b1027 0%,#1f2a56 100%);padding:28px 32px;border-radius:20px 20px 0 0;">
                <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#9fb5ff;font-weight:700;">
                  Rankio Contact Form
                </div>
                <div style="margin-top:10px;font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;">
                  New message received
                </div>
                <div style="margin-top:8px;font-size:14px;line-height:1.7;color:#dbe4ff;">
                  A visitor submitted the contact form. Details are summarized below.
                </div>
              </td>
            </tr>
            <tr>
              <td style="background:#ffffff;padding:28px 32px;border-left:1px solid #d9e2f1;border-right:1px solid #d9e2f1;border-bottom:1px solid #d9e2f1;border-radius:0 0 20px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0 12px;">
                  <tr>
                    <td style="width:33.33%;padding:0 8px 0 0;vertical-align:top;">
                      <div style="background:#f8faff;border:1px solid #dbe3f1;border-radius:16px;padding:16px;">
                        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Full Name</div>
                        <div style="margin-top:8px;font-size:16px;line-height:1.5;font-weight:700;color:#0f172a;">${safeName}</div>
                      </div>
                    </td>
                    <td style="width:33.33%;padding:0 4px;vertical-align:top;">
                      <div style="background:#f8faff;border:1px solid #dbe3f1;border-radius:16px;padding:16px;">
                        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Work Email</div>
                        <div style="margin-top:8px;font-size:16px;line-height:1.5;font-weight:700;color:#0f172a;">${safeEmail}</div>
                      </div>
                    </td>
                    <td style="width:33.33%;padding:0 0 0 8px;vertical-align:top;">
                      <div style="background:#f8faff;border:1px solid #dbe3f1;border-radius:16px;padding:16px;">
                        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Reason</div>
                        <div style="margin-top:8px;font-size:16px;line-height:1.5;font-weight:700;color:#0f172a;">${safeReason}</div>
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:4px;">
                  <tr>
                    <td style="padding:0 0 18px;">
                      <div style="background:#ffffff;border:1px solid #dbe3f1;border-radius:16px;padding:18px 20px;">
                        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Website URL</div>
                        <div style="margin-top:8px;font-size:15px;line-height:1.7;color:#0f172a;word-break:break-word;">
                          ${safeWebsite}
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 0 18px;">
                      <div style="background:#f8faff;border:1px solid #dbe3f1;border-radius:16px;padding:18px 20px;">
                        <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#64748b;font-weight:700;">Message</div>
                        <div style="margin-top:10px;font-size:15px;line-height:1.8;color:#334155;white-space:normal;">
                          ${safeMessage}
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding-top:4px;font-size:12px;line-height:1.6;color:#64748b;">
                      Submitted: ${safeSubmitted}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  if (!resendKey || !adminEmail) {
    await logAdminError(supabase, {
      source: "contact-notify",
      severity: "critical",
      code: !adminEmail ? "MISSING_ADMIN_EMAIL" : "MISSING_RESEND_API_KEY",
      message: !adminEmail ? "Contact admin email is not configured" : "Resend API key is not configured for contact emails",
      details: { contact_id: contactId, email, reason, has_resend_key: Boolean(resendKey), has_admin_email: Boolean(adminEmail) },
      userId,
      websiteUrl: normalizedWebsite || null,
    });
    return new Response(
      JSON.stringify({ ok: true, contact_id: contactId, email_sent: false, email_error: !adminEmail ? "MISSING_ADMIN_EMAIL" : "MISSING_RESEND_API_KEY" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
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
      source: "contact-notify",
      severity: "error",
      code: "EMAIL_SEND_FAILED",
      message: "Contact message was saved, but admin email failed",
      details: { contact_id: contactId, status: resendRes.status, email_error: details },
      userId,
      websiteUrl: normalizedWebsite || null,
    });
    return new Response(JSON.stringify({ ok: true, contact_id: contactId, email_sent: false, email_error: details }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response(JSON.stringify({ ok: true, contact_id: contactId, email_sent: true, submitted_at: createdAt }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
