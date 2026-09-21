import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../providers/auth-provider";
import { formatReadableDate } from "./date-format";

type Website = {
  id: string;
  user_id: string;
  url: string;
  status?: string | null;
  score?: number | null;
  latest_report_id?: string | null;
  latest_report_at?: string | null;
  latest_report_level?: string | null;
  latest_access_tier_required?: string | null;
  latest_is_cached?: boolean | null;
  created_at?: string | null;
};

type Scan = {
  id: string;
  website_id: string;
  ai_score: number | null;
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
};

type Report = {
  id: string;
  website_id?: string | null;
  status?: string | null;
  ai_score?: number | null;
  performance_score?: number | null;
  seo_score?: number | null;
  technical_score?: number | null;
  raw_scan_data?: unknown;
  ai_summary?: string | null;
  recommendations?: unknown;
  generated_at?: string | null;
  share_token?: string | null;
};

type Subscription = {
  id: string;
  plan?: string | null;
  plan_name?: string | null;
  plan_slug?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string | null;
  report_quota?: number | null;
  reports_used?: number | null;
  lifetime_access?: boolean | null;
  payment_provider?: string | null;
  payment_customer_id?: string | null;
  payment_order_id?: string | null;
  latest_payment_transaction_id?: string | null;
  current_period_end?: string | null;
};

export type PaymentTransaction = {
  id: string;
  user_id?: string | null;
  subscription_id?: string | null;
  provider?: string | null;
  provider_order_id?: string | null;
  provider_capture_id?: string | null;
  provider_payer_id?: string | null;
  status?: string | null;
  plan_slug?: string | null;
  plan_name?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  created_at?: string | null;
};

export type ReportUnlock = {
  id: string;
  user_id?: string | null;
  report_id?: string | null;
  subscription_id?: string | null;
  payment_transaction_id?: string | null;
  plan_slug?: string | null;
  credit_used?: boolean | null;
  unlock_reason?: string | null;
  is_cached?: boolean | null;
  created_at?: string | null;
  reports?: {
    id?: string | null;
    ai_score?: number | null;
    generated_at?: string | null;
    websites?: {
      url?: string | null;
      normalized_url?: string | null;
    } | null;
  } | null;
  payment_transactions?: {
    provider_order_id?: string | null;
    amount?: number | string | null;
    currency?: string | null;
    status?: string | null;
  } | null;
};

function normalizeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSubscription(row: Subscription | null): Subscription | null {
  if (!row) return null;
  return {
    ...row,
    report_quota: normalizeInteger(row.report_quota),
    reports_used: normalizeInteger(row.reports_used),
  };
}

function isBillingAuditSchemaPending(error: { message?: string | null; code?: string | null } | null | undefined): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  const code = String(error?.code ?? "").toUpperCase();
  return (
    code === "PGRST200" ||
    code === "PGRST205" ||
    message.includes("payment_transactions") ||
    message.includes("report_unlocks") ||
    message.includes("schema cache")
  );
}

const fallbackWebsites: Website[] = [
  { id: "demo-1", user_id: "demo", url: "https://example-site.com", status: "optimized" },
  { id: "demo-2", user_id: "demo", url: "https://my-portfolio.com", status: "good" },
];

export function useWebsites() {
  const { user } = useAuth();
  const [data, setData] = useState<Website[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWebsites = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: websites, error: wErr } = await supabase
      .from("websites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (wErr) {
      setError(wErr.message);
      setData([]);
      setLoading(false);
      return;
    }

    const websiteRows = (websites ?? []) as Website[];
    const ids = websiteRows.map((w) => w.id);

    // Hydrate with latest report info (status + AI score) so the Websites page
    // reflects the most recent completed scan.
    let latestByWebsiteId: Record<
      string,
      {
        id: string;
        website_id: string;
        status: string | null;
        ai_score: number | null;
        generated_at: string | null;
        report_level?: string | null;
        access_tier_required?: string | null;
        is_cached?: boolean | null;
      }
    > =
      {};

    if (ids.length > 0) {
      const { data: reports, error: rErr } = await supabase
        .from("reports")
        .select("id, website_id, status, ai_score, generated_at, report_level, access_tier_required, is_cached")
        .in("website_id", ids)
        .eq("status", "completed")
        .order("generated_at", { ascending: false })
        .limit(500);

      if (!rErr) {
        for (const row of (reports ?? []) as any[]) {
          const websiteId = String(row.website_id ?? "");
          if (!websiteId) continue;
          if (!latestByWebsiteId[websiteId]) {
            latestByWebsiteId[websiteId] = row;
          }
        }
      }
    }

    setError(null);
    setData(
      websiteRows.map((w) => {
        const latest = latestByWebsiteId[w.id];
        return {
          ...w,
          status: latest?.status ?? w.status ?? null,
          score: latest?.ai_score ?? null,
          latest_report_id: latest?.id ?? null,
          latest_report_at: latest?.generated_at ?? null,
          latest_report_level: latest?.report_level ?? null,
          latest_access_tier_required: latest?.access_tier_required ?? null,
          latest_is_cached: latest?.is_cached ?? null,
        };
      })
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWebsites();
  }, [fetchWebsites]);

  useEffect(() => {
    if (!user) return;
    const handler = () => fetchWebsites();
    window.addEventListener("rankio:visitor-claimed", handler);
    window.addEventListener("rankio:dashboard-refresh", handler);
    return () => {
      window.removeEventListener("rankio:visitor-claimed", handler);
      window.removeEventListener("rankio:dashboard-refresh", handler);
    };
  }, [user, fetchWebsites]);

  return { websites: user ? data : fallbackWebsites, loading, error, refetch: fetchWebsites };
}

export function useScansByWebsite(websiteId?: string) {
  const { user } = useAuth();
  const [data, setData] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !websiteId) return;
    setLoading(true);
    supabase
      .from("scans")
      .select("*")
      .eq("website_id", websiteId)
      .order("started_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else {
          setError(null);
          setData(data ?? []);
        }
        setLoading(false);
      });
  }, [user, websiteId]);

  return { scans: data, loading, error };
}

export function useReports() {
  const { user } = useAuth();
  const [data, setData] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: reports, error: repErr } = await supabase
      .from("reports")
      .select("*, websites!inner(user_id)")
      .eq("websites.user_id", user.id)
      .eq("status", "completed")
      .order("generated_at", { ascending: false });

    if (repErr) {
      setError(repErr.message);
      setData([]);
    } else {
      setError(null);
      setData(((reports ?? []) as any[]).map(({ websites: _websites, ...report }) => report));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useEffect(() => {
    if (!user) return;
    const handler = () => fetchReports();
    window.addEventListener("rankio:visitor-claimed", handler);
    window.addEventListener("rankio:dashboard-refresh", handler);
    return () => {
      window.removeEventListener("rankio:visitor-claimed", handler);
      window.removeEventListener("rankio:dashboard-refresh", handler);
    };
  }, [user, fetchReports]);

  return { reports: data, loading, error, refetch: fetchReports };
}

export function useStats() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalWebsites: 0,
    averageScore: 0,
    activePlan: "No active package",
    reportsGenerated: 0,
    recentScans: [] as { url: string; score: number; date?: string; status?: string; reportId?: string }[],
  });

  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats({
        totalWebsites: fallbackWebsites.length,
        averageScore: 78,
        activePlan: "Pro",
        reportsGenerated: 24,
        recentScans: [{ url: "https://example-site.com", score: 84, date: "Demo", status: "Optimized" }],
      });
      return;
    }

    const cacheKey = `rankio.dashboardStats.${user.id}`;
    let hasCachedStats = false;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setStats(parsed);
          hasCachedStats = true;
        }
      }
    } catch {
      // ignore cache read failures
    }

    setLoading(!hasCachedStats);
    try {
      const [websitesRes, subsRes] = await Promise.all([
        supabase
          .from("websites")
          .select("id, url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .order("updated_at", { ascending: false })
          .order("current_period_end", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (websitesRes.error) {
        throw new Error(websitesRes.error.message);
      }

      const websites = (websitesRes.data ?? []) as Website[];
      const totalWebsites = websites.length;
      const websiteIds = websites.map((w) => w.id);
      const urlByWebsiteId = new Map<string, string>();
      for (const w of websites) urlByWebsiteId.set(String(w.id), String(w.url ?? ""));

      let reports: any[] = [];
      let reportsGenerated = 0;
      let averageScore = 0;
      let recentScans: { url: string; score: number; date?: string; status?: string; reportId?: string }[] = [];

      if (websiteIds.length > 0) {
        const [reportsRes, reportsCountRes] = await Promise.all([
          supabase
            .from("reports")
            .select("id, website_id, ai_score, status, generated_at")
            .in("website_id", websiteIds)
            .eq("status", "completed")
            .order("generated_at", { ascending: false })
            .limit(50),
          supabase.from("reports").select("id", { count: "exact", head: true }).in("website_id", websiteIds).eq("status", "completed"),
        ]);

        if (reportsRes.error) throw new Error(reportsRes.error.message);
        reports = (reportsRes.data ?? []) as any[];
        reportsGenerated = reportsCountRes.count ?? 0;

        const scored = reports
          .map((r) => (typeof r?.ai_score === "number" ? r.ai_score : null))
          .filter((v) => typeof v === "number") as number[];
        averageScore =
          scored.length > 0 ? Math.round((scored.reduce((sum, n) => sum + n, 0) / scored.length) * 10) / 10 : 0;

        const toStatusLabel = (score: number) => {
          if (score >= 85) return "Optimized";
          if (score >= 70) return "Good";
          return "Needs Improvement";
        };

        recentScans = reports.slice(0, 5).map((r) => {
          const websiteId = String(r.website_id ?? "");
          const url = urlByWebsiteId.get(websiteId) || `Site ${websiteId}`;
          const score = typeof r.ai_score === "number" ? r.ai_score : 0;
          const date = formatReadableDate(r.generated_at);
          return {
            url,
            score,
            date,
            status: toStatusLabel(score),
            reportId: String(r.id ?? ""),
          };
        });
      }

      const subscriptionRow = subsRes.data as Subscription | null;
      const activePlan =
        subscriptionRow?.plan_name ??
        subscriptionRow?.plan ??
        (subscriptionRow?.plan_slug ? subscriptionRow.plan_slug.toUpperCase() : "No active package");

      const nextStats = {
        totalWebsites,
        averageScore,
        activePlan,
        reportsGenerated,
        recentScans,
      };
      setStats(nextStats);
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(nextStats));
      } catch {
        // ignore cache write failures
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      void fetchStats();
    };
    window.addEventListener("rankio:subscription-updated", handler);
    window.addEventListener("rankio:dashboard-refresh", handler);
    return () => {
      window.removeEventListener("rankio:subscription-updated", handler);
      window.removeEventListener("rankio:dashboard-refresh", handler);
    };
  }, [user, fetchStats]);

  return { stats, loading, error };
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setData(null);
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      setLoading(true);
      const delays = [0, 350, 1200];

      for (const delay of delays) {
        if (delay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, delay));
        }

        const { data, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["active", "trialing"])
          .order("updated_at", { ascending: false })
          .order("current_period_end", { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          setError(error.message);
          setData(null);
          setLoading(false);
          return;
        }

        const row = normalizeSubscription((data as Subscription | null) ?? null);
        if (row) {
          setData(row);
          setError(null);
          setLoading(false);
          return;
        }
      }

      setData(null);
      setError(null);
      setLoading(false);
    };

    fetchSubscription();

    const handler = () => {
      void fetchSubscription();
    };
    window.addEventListener("rankio:subscription-updated", handler);
    return () => window.removeEventListener("rankio:subscription-updated", handler);
  }, [authLoading, user]);

  return { subscription: data, loading, error };
}

export function useSubscriptionHistory() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: rows, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setData([]);
    } else {
      setError(null);
      setData(((rows ?? []) as Subscription[]).map((row) => normalizeSubscription(row)).filter(Boolean) as Subscription[]);
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      void fetchHistory();
    };
    window.addEventListener("rankio:subscription-updated", handler);
    return () => window.removeEventListener("rankio:subscription-updated", handler);
  }, [user, fetchHistory]);

  return { subscriptions: data, loading, error, refetch: fetchHistory };
}

export function usePaymentTransactions() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: rows, error } = await supabase
      .from("payment_transactions")
      .select("id, user_id, subscription_id, provider, provider_order_id, provider_capture_id, provider_payer_id, status, plan_slug, plan_name, amount, currency, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (isBillingAuditSchemaPending(error)) {
        setError(null);
        setData([]);
        setLoading(false);
        return;
      }
      setError(error.message);
      setData([]);
    } else {
      setError(null);
      setData((rows ?? []) as PaymentTransaction[]);
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      void fetchTransactions();
    };
    window.addEventListener("rankio:subscription-updated", handler);
    return () => window.removeEventListener("rankio:subscription-updated", handler);
  }, [user, fetchTransactions]);

  return { transactions: data, loading, error, refetch: fetchTransactions };
}

export function useReportUnlockHistory() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ReportUnlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUnlocks = useCallback(async () => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: rows, error } = await supabase
      .from("report_unlocks")
      .select(`
        id,
        user_id,
        report_id,
        subscription_id,
        payment_transaction_id,
        plan_slug,
        credit_used,
        unlock_reason,
        is_cached,
        created_at,
        reports (
          id,
          ai_score,
          generated_at,
          websites (
            url,
            normalized_url
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (isBillingAuditSchemaPending(error)) {
        setError(null);
        setData([]);
        setLoading(false);
        return;
      }
      setError(error.message);
      setData([]);
    } else {
      const unlockRows = (rows ?? []) as ReportUnlock[];
      const transactionIds = Array.from(
        new Set(
          unlockRows
            .map((row) => String(row.payment_transaction_id ?? "").trim())
            .filter(Boolean)
        )
      );

      let transactionById = new Map<string, ReportUnlock["payment_transactions"]>();
      if (transactionIds.length > 0) {
        const { data: transactionRows, error: transactionError } = await supabase
          .from("payment_transactions")
          .select("id, provider_order_id, amount, currency, status")
          .in("id", transactionIds);

        if (!transactionError) {
          transactionById = new Map(
            ((transactionRows ?? []) as Array<PaymentTransaction & { id: string }>).map((transaction) => [
              transaction.id,
              {
                provider_order_id: transaction.provider_order_id,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
              },
            ])
          );
        } else if (!isBillingAuditSchemaPending(transactionError)) {
          setError(transactionError.message);
          setData([]);
          setLoading(false);
          return;
        }
      }

      setError(null);
      setData(
        unlockRows.map((unlock) => ({
          ...unlock,
          payment_transactions: unlock.payment_transaction_id
            ? transactionById.get(String(unlock.payment_transaction_id)) ?? null
            : null,
        }))
      );
    }
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => {
    void fetchUnlocks();
  }, [fetchUnlocks]);

  useEffect(() => {
    if (!user) return;
    const handler = () => {
      void fetchUnlocks();
    };
    window.addEventListener("rankio:subscription-updated", handler);
    return () => window.removeEventListener("rankio:subscription-updated", handler);
  }, [user, fetchUnlocks]);

  return { unlocks: data, loading, error, refetch: fetchUnlocks };
}
