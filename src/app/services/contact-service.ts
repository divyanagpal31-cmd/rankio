import { supabase } from "../../lib/supabase";

export type ContactPayload = {
  fullName: string;
  email: string;
  website?: string;
  reason: string;
  message: string;
};

export async function submitContactMessage(
  payload: ContactPayload,
): Promise<{ error?: string; contactId?: string; emailSent?: boolean }> {
  const { data, error } = await supabase.functions.invoke("contact-notify", {
    body: {
      full_name: payload.fullName.trim(),
      email: payload.email.trim(),
      website_url: payload.website?.trim() || "",
      reason: payload.reason.trim(),
      message: payload.message.trim(),
      source: "contact-page",
    },
  });

  if (!error) {
    const contactId = String((data as any)?.contact_id ?? (data as any)?.contactId ?? "").trim() || undefined;
    const emailSentRaw = (data as any)?.email_sent ?? (data as any)?.emailSent;
    const emailSent = typeof emailSentRaw === "boolean" ? emailSentRaw : undefined;
    return { contactId, emailSent };
  }

  const defaultMsg = error.message ?? "Failed to submit";
  const lower = defaultMsg.toLowerCase();
  if (
    lower.includes("failed to send a request to the edge function") ||
    lower.includes("edge function returned a non-2xx status code") ||
    lower.includes("not found")
  ) {
    return {
      error:
        "Contact service is not configured. Deploy the `contact-notify` Edge Function and set it to public (verify_jwt=false).",
    };
  }

  const ctx = (error as any)?.context as Response | undefined;
  if (ctx && typeof ctx.text === "function") {
    try {
      const raw = await ctx.text();
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as any;
          const msg = String(parsed?.message ?? parsed?.error ?? "").trim();
          const details = String(parsed?.details ?? "").trim();
          if (msg && details) return { error: `${msg}: ${details}` };
          if (msg) return { error: msg };
        } catch {
          return { error: raw };
        }
      }
    } catch {
      // ignore
    }
  }

  if (lower.includes("resend") || lower.includes("service_role") || lower.includes("supabase_url")) {
    return { error: "We couldn't submit your request right now. Please email support@rankio.ai." };
  }

  return { error: defaultMsg || "We couldn't submit your request right now. Please email support@rankio.ai." };
}
