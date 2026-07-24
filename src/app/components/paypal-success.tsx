import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "./ui/button";
import { capturePayPalCheckout } from "../services/paypal-service";
import { paymentPlans } from "../services/payment-plans";
import { supabase } from "../../lib/supabase";

function getTokenFromLocation(search: string): string {
  return new URLSearchParams(search).get("token")?.trim() ?? "";
}

function getReportIdFromLocation(search: string): string {
  return new URLSearchParams(search).get("report_id")?.trim() ?? "";
}

export function PayPalSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Record<string, unknown> | null>(null);

  const token = useMemo(() => getTokenFromLocation(location.search), [location.search]);
  const reportId = useMemo(() => getReportIdFromLocation(location.search), [location.search]);
  const captureLockKey = `rankio.paypal.capture.${token}`;
  const captureStartedAtKey = `${captureLockKey}.started_at`;

  useEffect(() => {
    let cancelled = false;
    let retryTimer: number | null = null;

    async function run() {
      if (!token) {
        setError("Missing PayPal order token.");
        setLoading(false);
        return;
      }

      try {
        const locked = sessionStorage.getItem(captureLockKey);
        if (locked === "done") {
          if (reportId) {
            navigate(`/report?reportId=${encodeURIComponent(reportId)}`, { replace: true });
            return;
          }
          setLoading(false);
          return;
        }
        if (locked === "running") {
          const startedAtRaw = sessionStorage.getItem(captureStartedAtKey);
          const startedAt = startedAtRaw ? Number(startedAtRaw) : NaN;
          if (Number.isFinite(startedAt) && Date.now() - startedAt < 15000) {
            setLoading(true);
            retryTimer = window.setTimeout(() => {
              if (!cancelled) {
                void run();
              }
            }, 1000);
            return;
          }
        }
        sessionStorage.setItem(captureLockKey, "running");
        sessionStorage.setItem(captureStartedAtKey, String(Date.now()));
      } catch {
        // ignore storage failures
      }

      const result = await capturePayPalCheckout(token);
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        try {
          sessionStorage.removeItem(captureLockKey);
          sessionStorage.removeItem(captureStartedAtKey);
        } catch {
          // ignore storage failures
        }
      } else {
        setPlanId(result.planId ?? null);
        setSubscription(result.subscription ?? null);
        try {
          sessionStorage.setItem(captureLockKey, "done");
          sessionStorage.removeItem(captureStartedAtKey);
        } catch {
          // ignore storage failures
        }
        window.dispatchEvent(new Event("rankio:subscription-updated"));
        if (reportId) {
          const { data: sessionData } = await supabase.auth.getSession();
          const userId = sessionData.session?.user?.id;

          if (userId) {
            await supabase.rpc("finalize_paid_report_unlock", {
              p_user_id: userId,
              p_report_id: reportId,
            });
            try {
              sessionStorage.setItem(`rankio.reportUnlock.${userId}.${reportId}`, "1");
            } catch {
              // ignore storage failures
            }
          }

          navigate(`/report?reportId=${encodeURIComponent(reportId)}`, {
            replace: true,
            state: { from: "/", justPurchasedPlan: true },
          });
          return;
        }
      }
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [token, captureLockKey, captureStartedAtKey, navigate, reportId]);

  const planSlug = String(subscription?.plan_slug ?? planId ?? "").trim() as any;
  const plan = paymentPlans.find((item) => item.id === planSlug) ?? null;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-12">
      <div className="w-full rounded-3xl border border-border/60 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          {loading ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <CheckCircle2 className="h-6 w-6 text-green-600" />}
          <h1 className="text-3xl font-bold text-primary">Payment confirmation</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground">
            We’re confirming your PayPal order and activating your account now.
          </p>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{error}</p>
            <div className="flex flex-wrap gap-3">
              {reportId ? (
                <Button asChild>
                  <Link to={`/report?reportId=${encodeURIComponent(reportId)}`}>Open your report</Link>
                </Button>
              ) : null}
              <Button asChild>
                <Link to="/dashboard/subscription">Back to plans</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">Go home</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-muted-foreground">
              You’re all set. Your payment went through and your plan is active.
            </p>

            <div className="rounded-2xl bg-slate-50 p-5">
              <div className="text-sm text-muted-foreground">Activated plan</div>
              <div className="mt-1 text-2xl font-semibold text-primary">{plan?.name ?? "Your plan"}</div>
              {typeof subscription?.report_quota === "number" && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Report credits: {String(subscription.report_quota)} total
                </div>
              )}
              {typeof subscription?.payment_order_id === "string" && (
                <div className="mt-2 text-xs text-muted-foreground">Order ID: {String(subscription.payment_order_id)}</div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/dashboard/reports?startScan=1">
                  {reportId ? "Start another scan" : "Start scan"}
                </Link>
              </Button>
              {reportId ? (
                <Button variant="outline" asChild>
                  <Link to={`/report?reportId=${encodeURIComponent(reportId)}`}>View scanned report</Link>
                </Button>
              ) : null}
              <Button variant="outline" asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard/subscription">View plans</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

