import { supabase } from "../../lib/supabase";

export type LeadPayload = {
  plan: string;
  full_name?: string;
  email: string;
  company?: string;
  phone?: string;
  website?: string;
  notes?: string;
  source?: string;
};

export async function submitPlanLead(payload: LeadPayload): Promise<{ error?: string }> {
  const { error } = await supabase.functions.invoke("lead-notify", { body: payload });

  if (!error) return {};

  const defaultMsg = error.message ?? "Failed to submit";
  const lower = defaultMsg.toLowerCase();

  // If the Edge Function isn't reachable (common in local/dev or misconfigured env),
  // attempt a direct insert as a fallback. This only works if RLS allows it.
  if (
    lower.includes("failed to send a request to the edge function") ||
    lower.includes("edge function returned a non-2xx status code") ||
    lower.includes("not found")
  ) {
    const { error: insertErr } = await supabase.from("leads").insert({
      plan: payload.plan,
      full_name: payload.full_name?.trim() || null,
      email: payload.email,
      company: payload.company?.trim() || null,
      phone: payload.phone?.trim() || null,
      website: payload.website?.trim() || null,
      notes: payload.notes?.trim() || null,
      source: payload.source?.trim() || null,
    });

    if (!insertErr) return {};

    return {
      error: "We couldn't submit your request right now. Please email support@rankio.ai.",
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

  // Avoid leaking infra details to end-users.
  if (lower.includes("resend") || lower.includes("service_role") || lower.includes("supabase_url")) {
    return { error: "We couldn't submit your request right now. Please email support@rankio.ai." };
  }

  return { error: defaultMsg || "We couldn't submit your request right now. Please email support@rankio.ai." };
}
