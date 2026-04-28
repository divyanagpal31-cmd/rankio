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
  if (defaultMsg.toLowerCase().includes("failed to send a request to the edge function")) {
    return {
      error:
        "Lead notification service is not reachable. Make sure the `lead-notify` Edge Function is deployed and its secrets are set (RESEND_API_KEY, optional ADMIN_EMAIL).",
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

  return { error: defaultMsg };
}
