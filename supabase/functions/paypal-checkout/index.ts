import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";

type PayPalPlanId = "starter" | "growth";

type PayPalPlan = {
  id: PayPalPlanId;
  name: string;
  amount: string;
  reportQuota: number;
};

const plans: Record<PayPalPlanId, PayPalPlan> = {
  starter: { id: "starter", name: "AI Visibility Report", amount: "9.99", reportQuota: 1 },
  growth: { id: "growth", name: "Team Pack", amount: "34.99", reportQuota: 5 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID") ?? "";
const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET") ?? "";
const paypalApiBase = (Deno.env.get("PAYPAL_API_BASE") ?? "https://api-m.sandbox.paypal.com").replace(/\/$/, "");
const paypalCurrency = (Deno.env.get("PAYPAL_CURRENCY") ?? "USD").trim().toUpperCase();
const appName = Deno.env.get("APP_NAME") ?? "Rankio";

function getSupabaseSecretKey(): string {
  const secretKeysRaw = Deno.env.get("SUPABASE_SECRET_KEYS") ?? "";
  if (secretKeysRaw) {
    try {
      const parsed = JSON.parse(secretKeysRaw) as Record<string, string | undefined>;
      const defaultKey = String(parsed.default ?? parsed["default"] ?? "").trim();
      if (defaultKey) return defaultKey;
    } catch {
      // ignore malformed json and fall back to legacy key
    }
  }

  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

const supabaseSecretKey = getSupabaseSecretKey();

if (!supabaseUrl || !supabaseSecretKey || !paypalClientId || !paypalClientSecret) {
  console.warn("PayPal checkout function is missing required environment variables.");
}

const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function json(body: Record<string, unknown>, status = 200): Response {
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

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function getUser(req: Request): Promise<{ id: string; email?: string | null }> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) throw new Error("Missing authorization header");

  const authClient = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    throw new Error("Unable to verify account");
  }

  return { id: data.user.id, email: data.user.email };
}

async function getPayPalAccessToken(): Promise<string> {
  const response = await fetch(`${paypalApiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = String(payload?.error_description ?? payload?.error ?? "Unable to authenticate with PayPal");
    throw new Error(message);
  }

  const accessToken = String(payload?.access_token ?? "").trim();
  if (!accessToken) {
    throw new Error("PayPal did not return an access token");
  }

  return accessToken;
}

async function paypalRequest<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${paypalApiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => ({}))) as T & Record<string, unknown>;
  if (!response.ok) {
    const message = String((payload as any)?.message ?? (payload as any)?.name ?? "PayPal request failed");
    throw new Error(message);
  }
  return payload;
}

function getOrderStatus(order: Record<string, unknown> | null | undefined): string {
  return String(order?.status ?? "").trim().toUpperCase();
}

function getPayerId(order: Record<string, unknown> | null | undefined): string | null {
  return String((order?.payer as Record<string, unknown> | undefined)?.payer_id ?? "").trim() || null;
}

function getCaptureId(order: Record<string, unknown> | null | undefined): string | null {
  const purchaseUnits = Array.isArray(order?.purchase_units) ? order?.purchase_units : [];
  for (const unit of purchaseUnits as Record<string, unknown>[]) {
    const payments = unit?.payments as Record<string, unknown> | undefined;
    const captures = Array.isArray(payments?.captures) ? payments?.captures : [];
    const capture = captures[0] as Record<string, unknown> | undefined;
    const captureId = String(capture?.id ?? "").trim();
    if (captureId) return captureId;
  }
  return null;
}

function getCapturedAmount(order: Record<string, unknown> | null | undefined, plan: PayPalPlan): { amount: string; currency: string } {
  const purchaseUnits = Array.isArray(order?.purchase_units) ? order?.purchase_units : [];
  for (const unit of purchaseUnits as Record<string, unknown>[]) {
    const payments = unit?.payments as Record<string, unknown> | undefined;
    const captures = Array.isArray(payments?.captures) ? payments?.captures : [];
    const capture = captures[0] as Record<string, unknown> | undefined;
    const captureAmount = capture?.amount as Record<string, unknown> | undefined;
    const value = String(captureAmount?.value ?? "").trim();
    const currencyCode = String(captureAmount?.currency_code ?? "").trim().toUpperCase();
    if (value) {
      return { amount: value, currency: currencyCode || paypalCurrency };
    }

    const unitAmount = unit?.amount as Record<string, unknown> | undefined;
    const unitValue = String(unitAmount?.value ?? "").trim();
    const unitCurrency = String(unitAmount?.currency_code ?? "").trim().toUpperCase();
    if (unitValue) {
      return { amount: unitValue, currency: unitCurrency || paypalCurrency };
    }
  }

  return { amount: plan.amount, currency: paypalCurrency };
}

function getPlan(planIdRaw: unknown): PayPalPlan {
  const planId = String(planIdRaw ?? "").trim() as PayPalPlanId;
  const plan = plans[planId];
  if (!plan) {
    throw new Error("Unsupported plan");
  }
  return plan;
}

async function createSubscriptionRecord(params: {
  userId: string;
  orderId: string;
  payerId?: string | null;
  plan: PayPalPlan;
  capture: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const timestamp = new Date().toISOString();
  const payload = {
    user_id: params.userId,
    plan_name: params.plan.name,
    plan: params.plan.name,
    plan_slug: params.plan.id,
    report_quota: params.plan.reportQuota,
    reports_used: 0,
    lifetime_access: false,
    status: "active",
    payment_provider: "paypal",
    payment_customer_id: params.payerId ?? null,
    payment_subscription_id: null,
    payment_order_id: params.orderId,
    start_date: timestamp,
    end_date: null,
    current_period_end: null,
    updated_at: timestamp,
  };

  const { error: expireError } = await admin
    .from("subscriptions")
    .update({
      status: "expired",
      end_date: timestamp,
      current_period_end: timestamp,
      updated_at: timestamp,
    })
    .eq("user_id", params.userId)
    .in("status", ["active", "trialing", "pending"]);

  if (expireError) {
    throw new Error(expireError.message);
  }

  const { data, error } = await admin.from("subscriptions").insert(payload).select("*").single();
  if (error) throw new Error(error.message);

  const capturedAmount = getCapturedAmount(params.capture, params.plan);
  const { data: transaction, error: transactionError } = await admin
    .from("payment_transactions")
    .upsert(
      {
        user_id: params.userId,
        subscription_id: (data as any).id,
        provider: "paypal",
        provider_order_id: params.orderId,
        provider_capture_id: getCaptureId(params.capture),
        provider_payer_id: params.payerId ?? null,
        status: getOrderStatus(params.capture) || "COMPLETED",
        plan_slug: params.plan.id,
        plan_name: params.plan.name,
        amount: capturedAmount.amount,
        currency: capturedAmount.currency,
        raw_payload: params.capture,
        updated_at: timestamp,
      },
      { onConflict: "provider,provider_order_id" },
    )
    .select("*")
    .single();
  if (transactionError) throw new Error(transactionError.message);

  const { data: linkedSubscription, error: linkError } = await admin
    .from("subscriptions")
    .update({
      latest_payment_transaction_id: (transaction as any).id,
      updated_at: timestamp,
    })
    .eq("id", (data as any).id)
    .select("*")
    .single();
  if (linkError) throw new Error(linkError.message);

  return linkedSubscription as Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!supabaseUrl || !supabaseSecretKey || !paypalClientId || !paypalClientSecret) {
      if (supabaseUrl && supabaseSecretKey) {
        await logAdminError(admin, {
          source: "paypal-checkout",
          severity: "critical",
          code: "PAYPAL_CONFIG_MISSING",
          message: "PayPal checkout is missing required environment variables",
          details: {
            has_supabase_url: Boolean(supabaseUrl),
            has_supabase_secret_key: Boolean(supabaseSecretKey),
            has_paypal_client_id: Boolean(paypalClientId),
            has_paypal_client_secret: Boolean(paypalClientSecret),
          },
        });
      }
      return json(
        {
          error: "Payment checkout is not available right now. Please try again later or contact support.",
        },
        500,
      );
    }

    const user = await getUser(req);
    const body = await readJson(req);
    const action = String(body.action ?? "").trim();

    if (action === "create_order") {
      const plan = getPlan(body.plan_id);
      const returnUrl = String(body.return_url ?? "").trim();
      const cancelUrl = String(body.cancel_url ?? "").trim();
      if (!returnUrl || !cancelUrl) {
        return json({ error: "Missing return or cancel URL" }, 400);
      }

      const accessToken = await getPayPalAccessToken();
      const order = await paypalRequest<Record<string, unknown>>(accessToken, "/v2/checkout/orders", {
        method: "POST",
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: plan.id,
              custom_id: user.id,
              description: `${appName} ${plan.name} plan`,
              amount: {
                currency_code: paypalCurrency,
                value: plan.amount,
              },
            },
          ],
          application_context: {
            brand_name: appName,
            landing_page: "LOGIN",
            user_action: "PAY_NOW",
            shipping_preference: "NO_SHIPPING",
            return_url: returnUrl,
            cancel_url: cancelUrl,
          },
        }),
      });

      const approvalLink = Array.isArray(order.links)
        ? order.links.find((link: any) => String(link?.rel ?? "") === "approve" || String(link?.rel ?? "") === "payer-action")
        : null;
      const orderId = String(order.id ?? "").trim();
      const approvalUrl = String(approvalLink?.href ?? "").trim();

      if (!orderId || !approvalUrl) {
        return json({ error: "PayPal did not return an approval URL" }, 500);
      }

      return json({
        order_id: orderId,
        approval_url: approvalUrl,
        plan_id: plan.id,
        amount: plan.amount,
        currency: paypalCurrency,
      });
    }

    if (action === "capture_order") {
      const orderId = String(body.order_id ?? "").trim();
      if (!orderId) return json({ error: "Missing order ID" }, 400);

      const accessToken = await getPayPalAccessToken();
      const order = await paypalRequest<Record<string, unknown>>(accessToken, `/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
        method: "GET",
      });

      const purchaseUnit = Array.isArray(order.purchase_units) ? (order.purchase_units[0] as Record<string, unknown> | undefined) : undefined;
      const plan = getPlan(purchaseUnit?.reference_id);
      const orderUserId = String(purchaseUnit?.custom_id ?? "").trim();
      if (orderUserId && orderUserId !== user.id) {
        return json({ error: "This order does not belong to the signed-in account." }, 403);
      }

      const existingSubscription = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("payment_order_id", orderId)
        .maybeSingle();
      if (existingSubscription.data) {
        const capturedAmount = getCapturedAmount(order, plan);
        const { data: transaction } = await admin
          .from("payment_transactions")
          .upsert(
            {
              user_id: user.id,
              subscription_id: (existingSubscription.data as any).id,
              provider: "paypal",
              provider_order_id: orderId,
              provider_capture_id: getCaptureId(order),
              provider_payer_id: getPayerId(order),
              status: getOrderStatus(order) || "COMPLETED",
              plan_slug: plan.id,
              plan_name: plan.name,
              amount: capturedAmount.amount,
              currency: capturedAmount.currency,
              raw_payload: order,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "provider,provider_order_id" },
          )
          .select("id")
          .single();

        if ((transaction as any)?.id) {
          await admin
            .from("subscriptions")
            .update({
              latest_payment_transaction_id: (transaction as any).id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", (existingSubscription.data as any).id);
        }

        return json({
          order_id: orderId,
          plan_id: plan.id,
          subscription: existingSubscription.data,
        });
      }

      const orderStatus = getOrderStatus(order);
      let capture: Record<string, unknown> = order;
      if (orderStatus !== "COMPLETED") {
        try {
          capture = await paypalRequest<Record<string, unknown>>(
            accessToken,
            `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
            {
              method: "POST",
            },
          );
        } catch (error) {
          const refreshedOrder = await paypalRequest<Record<string, unknown>>(
            accessToken,
            `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
            {
              method: "GET",
            },
          );
          const refreshedStatus = getOrderStatus(refreshedOrder);
          if (refreshedStatus !== "COMPLETED") {
            throw error;
          }
          capture = refreshedOrder;
        }
      }

      const status = getOrderStatus(capture) || getOrderStatus(order);
      if (status !== "COMPLETED" && status !== "APPROVED") {
        return json({ error: "PayPal checkout was not completed." }, 400);
      }

      const subscriptionAfterCapture = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("payment_order_id", orderId)
        .maybeSingle();
      if (subscriptionAfterCapture.data) {
        const capturedAmount = getCapturedAmount(capture, plan);
        const { data: transaction } = await admin
          .from("payment_transactions")
          .upsert(
            {
              user_id: user.id,
              subscription_id: (subscriptionAfterCapture.data as any).id,
              provider: "paypal",
              provider_order_id: orderId,
              provider_capture_id: getCaptureId(capture),
              provider_payer_id: getPayerId(capture) ?? getPayerId(order),
              status,
              plan_slug: plan.id,
              plan_name: plan.name,
              amount: capturedAmount.amount,
              currency: capturedAmount.currency,
              raw_payload: capture,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "provider,provider_order_id" },
          )
          .select("id")
          .single();

        if ((transaction as any)?.id) {
          await admin
            .from("subscriptions")
            .update({
              latest_payment_transaction_id: (transaction as any).id,
              updated_at: new Date().toISOString(),
            })
            .eq("id", (subscriptionAfterCapture.data as any).id);
        }

        return json({
          order_id: orderId,
          plan_id: plan.id,
          subscription: subscriptionAfterCapture.data,
        });
      }

      const payerId = getPayerId(capture) ?? getPayerId(order);
      const subscription = await createSubscriptionRecord({ userId: user.id, orderId, payerId, plan, capture });

      return json({
        order_id: orderId,
        plan_id: plan.id,
        subscription,
      });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    await logAdminError(admin, {
      source: "paypal-checkout",
      severity: "error",
      code: "PAYPAL_CHECKOUT_FAILED",
      message: "PayPal checkout failed",
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return json(
      {
        error: "Payment checkout failed. Please try again in a few minutes.",
      },
      500,
    );
  }
});
