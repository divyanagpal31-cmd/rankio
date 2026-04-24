import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { AlertCircle, Calendar, Download, Eye, FileText, Globe } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../providers/auth-provider";

type WebsiteRow = {
  id: string;
  url: string;
};

type ReportRow = {
  id: string;
  website_id: string;
  status: string | null;
  ai_score: number | null;
  generated_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

function normalizeStatus(value?: string | null) {
  return (value ?? "").toLowerCase().trim();
}

export function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [websiteMap, setWebsiteMap] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "processing" | "failed">("all");
  const [groupByWebsite, setGroupByWebsite] = useState(true);
  const [websiteFilter, setWebsiteFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setRows([]);
        setWebsiteMap({});
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      const { data: websites, error: wErr } = await supabase
        .from("websites")
        .select("id, url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (wErr) {
        setRows([]);
        setWebsiteMap({});
        setError(wErr.message);
        setLoading(false);
        return;
      }

      const websiteList = (websites ?? []) as WebsiteRow[];
      const ids = websiteList.map((w) => w.id);
      setWebsiteMap(Object.fromEntries(websiteList.map((w) => [w.id, w.url])));

      if (ids.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: reports, error: rErr } = await supabase
        .from("reports")
        .select("id, website_id, status, ai_score, generated_at")
        .in("website_id", ids)
        .order("generated_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      if (rErr) {
        setRows([]);
        setError(rErr.message);
      } else {
        setRows((reports ?? []) as ReportRow[]);
      }

      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const websiteOptions = useMemo(() => {
    const entries = Object.entries(websiteMap);
    entries.sort((a, b) => a[1].localeCompare(b[1]));
    return entries;
  }, [websiteMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (websiteFilter !== "all" && r.website_id !== websiteFilter) return false;
      if (statusFilter !== "all" && normalizeStatus(r.status) !== statusFilter) return false;
      if (!q) return true;
      const url = (websiteMap[r.website_id] ?? "").toLowerCase();
      return url.includes(q) || r.id.toLowerCase().includes(q);
    });
  }, [rows, query, statusFilter, websiteFilter, websiteMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportRow[]>();
    for (const r of filtered) {
      const key = r.website_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries())
      .map(([websiteId, reports]) => ({
        websiteId,
        url: websiteMap[websiteId] ?? `Website #${websiteId}`,
        reports,
      }))
      .sort((a, b) => a.url.localeCompare(b.url));
  }, [filtered, websiteMap]);

  const getStatusBadge = (status?: string | null) => {
    const normalized = (status ?? "").toLowerCase();
    if (normalized === "completed") {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
    }
    if (normalized === "processing") {
      return <Badge variant="outline">Processing</Badge>;
    }
    if (normalized === "failed") {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>;
    }
    return <Badge variant="outline">{status ?? "Pending"}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
            Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Access and download your AI readiness reports
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-muted-foreground">Loading reports...</p>}

      {!!user && (
        <Card className="border-border/40">
          <CardContent className="p-5 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <Label htmlFor="reportSearch">Search</Label>
              <Input
                id="reportSearch"
                placeholder="Search by website URL or report id…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="websiteFilter">Website</Label>
              <select
                id="websiteFilter"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value)}
              >
                <option value="all">All websites</option>
                {websiteOptions.map(([id, url]) => (
                  <option key={id} value={id}>
                    {url}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="statusFilter">Status</Label>
              <select
                id="statusFilter"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="md:col-span-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {filtered.length} of {rows.length} reports
              </p>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={groupByWebsite}
                  onChange={(e) => setGroupByWebsite(e.target.checked)}
                />
                Group by website
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {!groupByWebsite &&
          filtered.map((report) => (
            <Card key={report.id} className="border-border/40">
              <CardContent className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-primary">
                          {websiteMap[report.website_id] ?? `Website #${report.website_id}`}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(report.generated_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(report.status)}
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <p className="text-2xl font-semibold text-primary">{report.ai_score ?? "-"}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const from = `${location.pathname}${location.search}`;
                        navigate(`/report?reportId=${encodeURIComponent(report.id)}`, { state: { from } });
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {groupByWebsite &&
          grouped.map((group) => (
            <Card key={group.websiteId} className="border-border/40">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-primary truncate">{group.url}</h3>
                    <p className="text-xs text-muted-foreground">{group.reports.length} report(s)</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const latest = group.reports[0];
                      if (latest) {
                        const from = `${location.pathname}${location.search}`;
                        navigate(`/report?reportId=${encodeURIComponent(latest.id)}`, { state: { from } });
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Open Latest
                  </Button>
                </div>

                <div className="divide-y divide-border/40">
                  {group.reports.map((report) => (
                    <div key={report.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm text-primary truncate">{formatDate(report.generated_at)}</p>
                        <p className="text-xs text-muted-foreground truncate">{report.id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(report.status)}
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Score</p>
                          <p className="text-lg font-semibold text-primary">{report.ai_score ?? "-"}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const from = `${location.pathname}${location.search}`;
                            navigate(`/report?reportId=${encodeURIComponent(report.id)}`, { state: { from } });
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {!loading && !error && filtered.length === 0 && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Run your first scan from the Websites page to generate a report and it will appear here.
            </p>
            <Button
              onClick={() => navigate("/dashboard/websites")}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              Go to Websites
            </Button>
          </CardContent>
        </Card>
      )}

      {!user && (
        <Card className="border-border/40">
          <CardContent className="p-5 flex items-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Log in to view your reports.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
