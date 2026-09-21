import { Check, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router";

import { usePaymentTransactions, useReportUnlockHistory, useSubscription, useSubscriptionHistory } from "../../services/data-hooks";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useAuth } from "../../providers/auth-provider";
import { supabase } from "../../../lib/supabase";
import { getVisitorId } from "../../services/visitor-id";
import { paymentPlans, type PaymentPlanId, type PayPalCheckoutPlanId } from "../../services/payment-plans";
import { startPayPalCheckout } from "../../services/paypal-service";
import { formatReadableDate } from "../../services/date-format";
import { billingFaqs } from "../../data/faq-content";

function getPlanFromSearch(search: string): PaymentPlanId | null {
  const value = new URLSearchParams(search).get("plan")?.trim() ?? "";
  return value === "starter" || value === "growth" || value === "pro" ? (value as PaymentPlanId) : null;
}

function getTabFromSearch(search: string): "overview" | "plans" | "billing" | "reports" | null {
  const value = new URLSearchParams(search).get("tab")?.trim() ?? "";
  return value === "overview" || value === "plans" || value === "billing" || value === "reports" ? value : null;
}

function getReportIdFromSearch(search: string): string | null {
  return new URLSearchParams(search).get("reportId")?.trim() ?? null;
}

export function CreditsBilling() {
  const { subscription } = useSubscription();
  const { subscriptions, loading: historyLoading, error: historyError } = useSubscriptionHistory();
  const { transactions, loading: transactionsLoading, error: transactionsError } = usePaymentTransactions();
  const { unlocks, loading: unlocksLoading, error: unlocksError } = useReportUnlockHistory();
  const { user } = useAuth();
  const location = useLocation();
  const [activePlanId, setActivePlanId] = useState<PaymentPlanId | null>(null);
  const [startingPlanId, setStartingPlanId] = useState<PaymentPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoStartRef = useRef<string | null>(null);
  const backfillRef = useRef<string | null>(null);

  const navigationState = (location.state as any) ?? null;
  const requestedPlan = useMemo(() => getPlanFromSearch(location.search), [location.search]);
  const requestedTab = useMemo(() => getTabFromSearch(location.search), [location.search]);
  const reportIdFromState = typeof navigationState?.reportId === "string" ? navigationState.reportId.trim() : "";
  const reportId = useMemo(
    () => getReportIdFromSearch(location.search) ?? (reportIdFromState || null),
    [location.search, reportIdFromState]
  );
  const initialTab = requestedTab ?? (requestedPlan || navigationState?.reason === "report_unlock" ? "plans" : "overview");

  useEffect(() => {
    if (requestedTab === "plans" || requestedPlan || navigationState?.reason === "report_unlock") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [navigationState?.reason, requestedPlan, requestedTab]);

  useEffect(() => {
    const visitorId = getVisitorId();
    if (!visitorId || !user?.id) return;
    const backfillKey = `${user.id}:${visitorId}`;
    if (backfillRef.current === backfillKey) return;
    backfillRef.current = backfillKey;

    const delays = [0, 750, 2000];
    let cancelled = false;

    const runBackfill = async () => {
      for (const delay of delays) {
        if (cancelled) return;
        if (delay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, delay));
        }

        try {
          const { data, error } = await supabase.rpc("claim_visitor_websites", { visitor_id: visitorId });

          if (cancelled) return;
          if (!error && Number(data ?? 0) > 0) return;
        } catch {
          // ignore backfill failures
        }
      }
    };

    void runBackfill();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const subscriptionPlan = String(subscription?.plan_slug ?? "").trim() as PaymentPlanId | "";
    if (subscriptionPlan === "starter" || subscriptionPlan === "growth" || subscriptionPlan === "pro") {
      setActivePlanId(subscriptionPlan);
      return;
    }
    if (!subscription?.plan && subscription?.plan_name) {
      const matched = paymentPlans.find((plan) => plan.name.toLowerCase() === String(subscription.plan_name).toLowerCase());
      if (matched) setActivePlanId(matched.id);
    }
  }, [subscription]);

  useEffect(() => {
    if (!requestedPlan) return;
    if (requestedPlan === "pro") return;
    if (autoStartRef.current === requestedPlan) return;
    autoStartRef.current = requestedPlan;

    let cancelled = false;

    async function beginCheckout() {
      setError(null);
      setStartingPlanId(requestedPlan);
      const result = await startPayPalCheckout(requestedPlan as PayPalCheckoutPlanId, { reportId });
      if (cancelled) return;

      setStartingPlanId(null);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.approvalUrl) {
        window.location.assign(result.approvalUrl);
      }
    }

    beginCheckout();
    return () => {
      cancelled = true;
    };
  }, [requestedPlan, reportId]);

  const handleCheckout = async (planId: PayPalCheckoutPlanId) => {
    setError(null);
    setStartingPlanId(planId);
    const result = await startPayPalCheckout(planId, { reportId });
    setStartingPlanId(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.approvalUrl) {
      window.location.assign(result.approvalUrl);
    }
  };

  const handleContactSales = () => {
    window.location.href = "mailto:sales@rankio.ai?subject=Rankio%20Pro%20Plan";
  };

  const formatStatus = (value?: string | null) => {
    const status = String(value ?? "").trim();
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : "-";
  };

  const formatPlan = (value?: string | null) => {
    const plan = String(value ?? "").trim();
    return plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "-";
  };

  const formatCurrency = (amount?: number | string | null, currency?: string | null) => {
    const parsed = typeof amount === "number" ? amount : Number(amount ?? NaN);
    if (!Number.isFinite(parsed)) return "-";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: String(currency ?? "USD").trim() || "USD",
      }).format(parsed);
    } catch {
      return `${String(currency ?? "USD").trim() || "USD"} ${parsed.toFixed(2)}`;
    }
  };

  const formatUnlockReason = (reason?: string | null, creditUsed?: boolean | null) => {
    const normalized = String(reason ?? "").trim();
    if (normalized === "cached_rescan_24h") return "Cached re-scan";
    if (normalized === "lifetime_access") return "Lifetime access";
    if (normalized === "credit_consumed") return "Credit consumed";
    return creditUsed ? "Credit consumed" : "No credit used";
  };

  const getUnlockWebsite = (unlock: { reports?: { websites?: { url?: string | null; normalized_url?: string | null } | null } | null }) =>
    unlock.reports?.websites?.url ?? unlock.reports?.websites?.normalized_url ?? "Report";

  const creditsLabel = (plan: { report_quota?: number | null; reports_used?: number | null; lifetime_access?: boolean | null }) => {
    if (plan.lifetime_access) return "Unlimited";
    if (typeof plan.report_quota === "number") return `${plan.reports_used ?? 0}/${plan.report_quota} used`;
    return "Active access";
  };

  const activePlanName = activePlanId
    ? paymentPlans.find((plan) => plan.id === activePlanId)?.name
    : subscription?.plan ?? subscription?.plan_name ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
          Plan & Billing
        </h1>
        <p className="text-muted-foreground mt-2">
          Choose a one-time package. Pay with PayPal and unlock the report credits you need.
        </p>
      </div>

      <Tabs defaultValue={initialTab} className="space-y-6">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-white p-1 shadow-sm">
          <TabsTrigger value="overview" className="min-w-fit rounded-md px-4 py-2 data-[state=active]:border-transparent data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="plans" className="min-w-fit rounded-md px-4 py-2 data-[state=active]:border-transparent data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-sm">Plans</TabsTrigger>
          <TabsTrigger value="billing" className="min-w-fit rounded-md px-4 py-2 data-[state=active]:border-transparent data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-sm">Billing History</TabsTrigger>
          <TabsTrigger value="reports" className="min-w-fit rounded-md px-4 py-2 data-[state=active]:border-transparent data-[state=active]:bg-accent data-[state=active]:text-white data-[state=active]:shadow-sm">Credit Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl border border-border/40 bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Current package</div>
          <div className="mt-1 text-2xl font-semibold text-primary">
            {activePlanName ?? "No active package"}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {subscription?.status ? `${formatStatus(subscription.status)} package` : "Choose a one-time package to unlock full reports."}
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/40 bg-white p-5 shadow-sm">
          <div className="text-sm text-muted-foreground">Available credits</div>
          <div className="mt-1 text-2xl font-semibold text-primary">
            {subscription?.lifetime_access
              ? "Unlimited"
              : typeof subscription?.report_quota === "number"
                ? Math.max(subscription.report_quota - (subscription.reports_used ?? 0), 0)
                : 0}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            {subscription ? creditsLabel(subscription) : "0 credits available"}
          </div>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        {paymentPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative rounded-[2rem] border px-6 py-7 transition-all duration-300 ${
              plan.popular
                ? "scale-[1.02] border-[#6a6af1] bg-[#f8f7ff] shadow-[0_20px_60px_rgba(91,91,214,0.16)]"
                : "border-[#6c72e8] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-accent/20">
                  BEST VALUE
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{plan.name}</h3>
                <p className="mt-3 max-w-[96%] whitespace-normal text-[13px] leading-6 text-slate-500 xl:text-[14px]">
                  {plan.description}
                </p>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold text-slate-900">{plan.priceLabel}</span>
              </div>
              <span className="pb-1 text-sm text-slate-400">One time payment</span>

              {plan.checkoutEnabled ? (
                <Button
                  onClick={() => handleCheckout(plan.id as PayPalCheckoutPlanId)}
                  disabled={startingPlanId === plan.id}
                  className="w-full"
                >
                  {startingPlanId === plan.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              ) : (
                <Button onClick={handleContactSales} className="w-full">
                  {plan.cta}
                </Button>
              )}
            </div>

            <div className="mt-7 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                  <span className="text-sm leading-6 text-slate-500">{feature}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-2xl border border-dashed border-border/60 bg-white p-5 text-sm text-muted-foreground">
        Not ready to buy yet? You can always review the <Link to="/#pricing" className="text-accent underline">public pricing page</Link> or reach out to sales for the Pro plan.
      </div>

      <Card className="rounded-2xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Billing FAQs</h2>
            <p className="mt-1 text-sm text-muted-foreground">Quick answers about payment, upgrades, and support.</p>
          </div>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue="item-1"
          className="mt-5 flex flex-col gap-3"
        >
          {billingFaqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`item-${index + 1}`}
              className="overflow-hidden rounded-[16px] border border-[#e1e4f3] bg-[#fbfbff]"
            >
              <AccordionTrigger className="px-4 py-4 text-left text-[15px] font-semibold text-primary no-underline hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-sm leading-7 text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
      <Card className="rounded-2xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Package History</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review your current and previous one-time packages.</p>
          </div>
          {historyError && <p className="text-sm text-red-600">{historyError}</p>}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-semibold">Package</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Credits</th>
                <th className="py-3 pr-4 font-semibold">Purchased On</th>
                <th className="py-3 pr-4 font-semibold">Ended On</th>
                <th className="py-3 pr-4 font-semibold">Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-muted-foreground">
                    Loading package history...
                  </td>
                </tr>
              ) : subscriptions.length > 0 ? (
                subscriptions.map((plan) => (
                  <tr key={plan.id} className="border-b border-border/40 last:border-0">
                    <td className="py-4 pr-4 font-medium text-primary">{plan.plan ?? plan.plan_name ?? "Plan"}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          String(plan.status ?? "").toLowerCase() === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {formatStatus(plan.status)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{creditsLabel(plan)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatReadableDate(plan.start_date ?? plan.created_at)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatReadableDate(plan.end_date ?? plan.current_period_end)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {plan.payment_order_id ? (
                        <span className="font-mono text-xs">{plan.payment_order_id}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-muted-foreground">
                    No package purchases yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Transaction History</h2>
            <p className="mt-1 text-sm text-muted-foreground">A billing ledger of completed payment provider transactions.</p>
          </div>
          {transactionsError && <p className="text-sm text-red-600">{transactionsError}</p>}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-semibold">Date</th>
                <th className="py-3 pr-4 font-semibold">Package</th>
                <th className="py-3 pr-4 font-semibold">Amount</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Provider</th>
                <th className="py-3 pr-4 font-semibold">Order ID</th>
                <th className="py-3 pr-4 font-semibold">Capture ID</th>
              </tr>
            </thead>
            <tbody>
              {transactionsLoading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-muted-foreground">
                    Loading transaction history...
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-border/40 last:border-0">
                    <td className="py-4 pr-4 text-muted-foreground">{formatReadableDate(transaction.created_at)}</td>
                    <td className="py-4 pr-4 font-medium text-primary">{transaction.plan_name ?? formatPlan(transaction.plan_slug)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatCurrency(transaction.amount, transaction.currency)}</td>
                    <td className="py-4 pr-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {formatStatus(transaction.status)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatPlan(transaction.provider)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {transaction.provider_order_id ? <span className="font-mono text-xs">{transaction.provider_order_id}</span> : "-"}
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {transaction.provider_capture_id ? <span className="font-mono text-xs">{transaction.provider_capture_id}</span> : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-muted-foreground">
                    No completed payment transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
      <Card className="rounded-2xl border border-border/40 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Report Credit Usage</h2>
            <p className="mt-1 text-sm text-muted-foreground">See which reports used credits and which were included as cached re-scans.</p>
          </div>
          {unlocksError && <p className="text-sm text-red-600">{unlocksError}</p>}
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-semibold">Unlocked On</th>
                <th className="py-3 pr-4 font-semibold">Website</th>
                <th className="py-3 pr-4 font-semibold">Score</th>
                <th className="py-3 pr-4 font-semibold">Package</th>
                <th className="py-3 pr-4 font-semibold">Credit</th>
                <th className="py-3 pr-4 font-semibold">Reason</th>
                <th className="py-3 pr-4 font-semibold">Payment ID</th>
              </tr>
            </thead>
            <tbody>
              {unlocksLoading ? (
                <tr>
                  <td colSpan={7} className="py-6 text-muted-foreground">
                    Loading unlocked reports...
                  </td>
                </tr>
              ) : unlocks.length > 0 ? (
                unlocks.map((unlock) => (
                  <tr key={unlock.id} className="border-b border-border/40 last:border-0">
                    <td className="py-4 pr-4 text-muted-foreground">{formatReadableDate(unlock.created_at)}</td>
                    <td className="py-4 pr-4 font-medium text-primary">
                      <Link to={`/report?reportId=${encodeURIComponent(String(unlock.report_id ?? ""))}`} className="hover:underline">
                        {getUnlockWebsite(unlock)}
                      </Link>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{typeof unlock.reports?.ai_score === "number" ? unlock.reports.ai_score : "-"}</td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatPlan(unlock.plan_slug)}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          unlock.credit_used ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {unlock.credit_used ? "Used" : "No"}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-muted-foreground">{formatUnlockReason(unlock.unlock_reason, unlock.credit_used)}</td>
                    <td className="py-4 pr-4 text-muted-foreground">
                      {unlock.payment_transactions?.provider_order_id ? (
                        <span className="font-mono text-xs">{unlock.payment_transactions.provider_order_id}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-muted-foreground">
                    No full report unlocks recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

