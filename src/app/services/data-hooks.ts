import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../providers/auth-provider";

type Website = {
  id: string;
  user_id: string;
  url: string;
  status?: string | null;
  score?: number | null;
  latest_report_id?: string | null;
  latest_report_at?: string | null;
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
  plan: string;
  status: string;
  current_period_end?: string | null;
};

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
      }
    > =
      {};

    if (ids.length > 0) {
      const { data: reports, error: rErr } = await supabase
        .from("reports")
        .select("id, website_id, status, ai_score, generated_at")
        .in("website_id", ids)
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
    return () => window.removeEventListener("rankio:visitor-claimed", handler);
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
      .select("*")
      .order("generated_at", { ascending: false });

    if (repErr) {
      setError(repErr.message);
      setData([]);
    } else {
      setError(null);
      setData(reports ?? []);
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
    return () => window.removeEventListener("rankio:visitor-claimed", handler);
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
    activePlan: "Free",
    reportsGenerated: 0,
    recentScans: [] as { url: string; score: number; date?: string; status?: string; reportId?: string }[],
  });

  useEffect(() => {
    if (!user) {
      setStats({
        totalWebsites: fallbackWebsites.length,
        averageScore: 78,
        activePlan: "Pro",
        reportsGenerated: 24,
        recentScans: [
          { url: "https://example-site.com", score: 84, date: "Demo", status: "Optimized" },
        ],
      });
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      try {
        const websitesRes = await supabase
          .from("websites")
          .select("id, url")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(500);

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
              .order("generated_at", { ascending: false })
              .limit(50),
            supabase
              .from("reports")
              .select("id", { count: "exact", head: true })
              .in("website_id", websiteIds),
          ]);

          if (reportsRes.error) throw new Error(reportsRes.error.message);
          reports = (reportsRes.data ?? []) as any[];
          reportsGenerated = reportsCountRes.count ?? 0;

          const scored = reports
            .map((r) => (typeof r?.ai_score === "number" ? r.ai_score : null))
            .filter((v) => typeof v === "number") as number[];
          averageScore =
            scored.length > 0
              ? Math.round((scored.reduce((sum, n) => sum + n, 0) / scored.length) * 10) / 10
              : 0;

          const toStatusLabel = (score: number) => {
            if (score >= 85) return "Optimized";
            if (score >= 70) return "Good";
            return "Needs Improvement";
          };

          recentScans = reports.slice(0, 5).map((r) => {
            const websiteId = String(r.website_id ?? "");
            const url = urlByWebsiteId.get(websiteId) || `Site ${websiteId}`;
            const score = typeof r.ai_score === "number" ? r.ai_score : 0;
            const date = r.generated_at ? new Date(r.generated_at).toLocaleString() : "";
            return {
              url,
              score,
              date,
              status: toStatusLabel(score),
              reportId: String(r.id ?? ""),
            };
          });
        }

        // Subscriptions table may not exist in some setups; keep it best-effort.
        const subsRes = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        const activePlan = (subsRes.data as Subscription | null)?.plan ?? "Free";

        setStats({
          totalWebsites,
          averageScore,
          activePlan,
          reportsGenerated,
          recentScans,
        });
        setError(null);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return { stats, loading, error };
}

export function useSubscription() {
  const { user } = useAuth();
  const [data, setData] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else {
          setData(data ?? null);
          setError(null);
        }
        setLoading(false);
      });
  }, [user]);

  return { subscription: data, loading, error };
}
