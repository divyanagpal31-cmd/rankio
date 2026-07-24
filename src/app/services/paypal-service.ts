import { supabase } from "../../lib/supabase";
import { getPaymentPlan, type PayPalCheckoutPlanId } from "./payment-plans";

type PayPalFunctionResult = {
  error?: string;
  order_id?: string;
  orderId?: string;
  approval_url?: string;
  approvalUrl?: string;
  plan_id?: string;
  planId?: string;
  subscription?: Record<string, unknown>;
};

async function readInvokeError(error: unknown): Promise<string | null> {
  const defaultMessage = (error as any)?.message ?? "Request failed";
  const context = (error as any)?.context as Response | undefined;
  if (!context || typeof context.text !== "function") return defaultMessage;

  try {
    const raw = await context.text();
    if (!raw) return defaultMessage;
    try {
      const parsed = JSON.parse(raw) as any;
      const message = String(parsed?.message ?? parsed?.error ?? "").trim();
      const details = String(parsed?.details ?? "").trim();
      if (message && details) return `${message}: ${details}`;
      if (message) return message;
      if (details) return details;
    } catch {
      return raw;
    }
  } catch {
    return defaultMessage;
  }

  return defaultMessage;
}

export async function startPayPalCheckout(
  planId: PayPalCheckoutPlanId,
  opts?: { reportId?: string | null },
): Promise<{ approvalUrl?: string; error?: string }> {
  try {
    const plan = getPaymentPlan(planId);
    const reportId = String(opts?.reportId ?? "").trim();
    const successUrl = new URL("/paypal/success", window.location.origin);
    const cancelUrl = new URL("/paypal/cancel", window.location.origin);
    if (reportId) {
      successUrl.searchParams.set("report_id", reportId);
      cancelUrl.searchParams.set("report_id", reportId);
    }
    const returnUrl = successUrl.toString();
    const cancelUrlString = cancelUrl.toString();
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { error: "Please wait a moment for your session to finish loading, then try again." };
    }

    const { data, error } = await supabase.functions.invoke("paypal-checkout", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        action: "create_order",
        plan_id: plan.id,
        return_url: returnUrl,
        cancel_url: cancelUrlString,
        report_id: reportId || undefined,
      },
    });

    if (error) {
      return { error: (await readInvokeError(error)) ?? "Unable to start PayPal checkout." };
    }

    const payload = (data ?? {}) as PayPalFunctionResult;
    const approvalUrl = String(payload.approval_url ?? payload.approvalUrl ?? "").trim();
    if (!approvalUrl) {
      return { error: "PayPal checkout did not return an approval link." };
    }

    return { approvalUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to start PayPal checkout." };
  }
}

export async function capturePayPalCheckout(orderId: string): Promise<{
  error?: string;
  subscription?: Record<string, unknown>;
  planId?: string;
}> {
  const trimmedOrderId = orderId.trim();
  if (!trimmedOrderId) return { error: "Missing PayPal order token." };

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      return { error: "Your session expired. Please sign in again and retry checkout." };
    }

    const { data, error } = await supabase.functions.invoke("paypal-checkout", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: {
        action: "capture_order",
        order_id: trimmedOrderId,
      },
    });

    if (error) {
      return { error: (await readInvokeError(error)) ?? "Unable to complete PayPal checkout." };
    }

    const payload = (data ?? {}) as PayPalFunctionResult;
    const subscription = payload.subscription ?? undefined;
    const planId = String(payload.plan_id ?? payload.planId ?? "").trim() || undefined;

    return { subscription, planId };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to complete PayPal checkout." };
  }
}
