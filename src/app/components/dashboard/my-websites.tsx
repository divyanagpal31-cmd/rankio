import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { BarChart3, Globe, RefreshCw, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { useWebsites } from "../../services/data-hooks";
import { useAuth } from "../../providers/auth-provider";
import { cancelScan, runScan } from "../../services/scan-service";
import { normalizeWebsiteInput } from "../../services/website-input";
import { supabase } from "../../../lib/supabase";
import { ScanningModal } from "../scanning-modal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useLocation, useNavigate } from "react-router";
import { buildReportComparison, type ReportComparisonInput } from "../../services/report-comparison-service";
import { formatReadableDate } from "../../services/date-format";

function normalizeStatus(value?: string | null) {
  return (value ?? "").toLowerCase().trim().replace(/[\s_]+/g, "-");
}

const REPORT_CACHE_HOURS = 24;
const REPORT_CACHE_MS = REPORT_CACHE_HOURS * 60 * 60 * 1000;
const REPORTS_PER_PAGE = 10;
const MAX_COMPARISON_REPORTS = 3;

type ComparableReport = ReportComparisonInput;

function isFreshReport(value?: string | null) {
  if (!value) return false;
  const generatedAtMs = new Date(value).getTime();
  return Number.isFinite(generatedAtMs) && Date.now() - generatedAtMs < REPORT_CACHE_MS;
}

function formatPlanLabel(value?: string | null) {
  const plan = String(value ?? "").trim();
  if (!plan) return "Preview";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

function reportPlanBadge(website: any) {
  const reportLevel = String(website?.latest_report_level ?? "").trim().toLowerCase();
  if (reportLevel !== "full") {
    return <Badge className="border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-50">Preview</Badge>;
  }

  return (
    <Badge className="border border-accent/20 bg-accent/10 text-accent hover:bg-accent/10">
      {formatPlanLabel(website?.latest_access_tier_required)} Plan
    </Badge>
  );
}

export function MyWebsites() {
  const SCAN_COMPLETE_DELAY_MS = 4700;
  const { websites, loading, error, refetch } = useWebsites();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScanning, setIsScanning] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewingReportFor, setViewingReportFor] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [newWebsiteError, setNewWebsiteError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [scanTargetUrl, setScanTargetUrl] = useState("");
  const [scanComplete, setScanComplete] = useState(false);
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const scanJobIdRef = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "optimized" | "good" | "needs-improvement" | "processing" | "failed" | "pending">("all");
  const [websiteFilter, setWebsiteFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonWebsite, setComparisonWebsite] = useState<any | null>(null);
  const [comparisonReports, setComparisonReports] = useState<ComparableReport[]>([]);
  const [selectedComparisonReportIds, setSelectedComparisonReportIds] = useState<string[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonReady, setComparisonReady] = useState(false);

  const shouldStartScan = useMemo(
    () => new URLSearchParams(location.search).get("startScan") === "1",
    [location.search]
  );

  useEffect(() => {
    if (!shouldStartScan || !user) return;

    setNewWebsiteUrl("");
    setNewWebsiteError(null);
    setActionError(null);
    setAddOpen(true);

    const params = new URLSearchParams(location.search);
    params.delete("startScan");
    navigate(
      {
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : "",
      },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate, shouldStartScan, user]);

  const handleReScan = async (id: string, url: string) => {
    if (!user) return;
    setIsScanning(id);
    setActionError(null);

    const website = websites.find((item) => item.id === id) as any;
    if (website?.latest_report_id && isFreshReport(website.latest_report_at)) {
      const from = `${location.pathname}${location.search}`;
      setIsScanning(null);
      navigate(`/report?reportId=${encodeURIComponent(website.latest_report_id)}`, {
        state: { from },
      });
      return;
    }

    setScanTargetUrl(url);
    setScanComplete(false);
    setScanningModalOpen(true);
    const scanAbortController = new AbortController();
    const scanJobId = crypto.randomUUID();
    scanAbortControllerRef.current = scanAbortController;
    scanJobIdRef.current = scanJobId;

    // Call Edge Function only when the latest report is older than 24h; this creates a new credit-backed scan.
    const { data, error } = await runScan(url, {
      accessToken: session?.access_token,
      requireAuth: true,
      signal: scanAbortController.signal,
      scanJobId,
    });
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    if (error) {
      if (scanAbortController.signal.aborted) return;
      setScanningModalOpen(false);
      setActionError(error);
    } else {
      refetch();
      const from = `${location.pathname}${location.search}`;
      setScanComplete(true);
      await new Promise((resolve) => window.setTimeout(resolve, SCAN_COMPLETE_DELAY_MS));
      setScanningModalOpen(false);
      setScanComplete(false);
      navigate(data?.id ? `/report?reportId=${encodeURIComponent(data.id)}` : "/report", {
        state: { from, report: data },
      });
    }

    setIsScanning(null);
  };

  const validateNewWebsiteUrl = (value: string) => {
    if (!value.trim()) return "Website URL is required";
    try {
      normalizeWebsiteInput(value);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "Please enter a valid website URL";
    }
  };

  const handleAddWebsite = async () => {
    if (!user) return;

    const err = validateNewWebsiteUrl(newWebsiteUrl);
    if (err) {
      setNewWebsiteError(err);
      return;
    }

    setAdding(true);
    setNewWebsiteError(null);
    setActionError(null);
    setScanComplete(false);

    const normalized = normalizeWebsiteInput(newWebsiteUrl);

    setAddOpen(false);
    setNewWebsiteUrl("");

    setScanTargetUrl(normalized);
    setScanningModalOpen(true);
    const scanAbortController = new AbortController();
    const scanJobId = crypto.randomUUID();
    scanAbortControllerRef.current = scanAbortController;
    scanJobIdRef.current = scanJobId;

    const { data, error: scanErr } = await runScan(normalized, {
      accessToken: session?.access_token,
      requireAuth: true,
      signal: scanAbortController.signal,
      scanJobId,
    });
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setAdding(false);

    if (scanErr) {
      if (scanAbortController.signal.aborted) return;
      setScanningModalOpen(false);
      setActionError(scanErr);
      return;
    }

    refetch();
    const from = `${location.pathname}${location.search}`;
    setScanComplete(true);
    await new Promise((resolve) => window.setTimeout(resolve, SCAN_COMPLETE_DELAY_MS));
    setScanningModalOpen(false);
    setScanComplete(false);
    navigate(data?.id ? `/report?reportId=${encodeURIComponent(data.id)}` : "/report", {
      state: { from, report: data },
    });
  };

  const handleStopScan = () => {
    void cancelScan(scanJobIdRef.current, { accessToken: session?.access_token });
    scanAbortControllerRef.current?.abort();
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setAdding(false);
    setIsScanning(null);
    setScanComplete(false);
    setScanningModalOpen(false);
  };

  const openReportUrl = (reportId: string, openInNewTab = false, report?: any) => {
    const target = `/report?reportId=${encodeURIComponent(reportId)}`;
    if (openInNewTab) {
      window.open(target, "_blank", "noopener,noreferrer");
      return;
    }

    const from = `${location.pathname}${location.search}`;
    navigate(target, { state: { from, report } });
  };

  const shouldOpenNewTab = (event: MouseEvent<HTMLElement>) => event.ctrlKey || event.metaKey;

  const handleViewReport = async (websiteId: string, openInNewTab = false) => {
    if (!user) return;
    setViewingReportFor(websiteId);
    setActionError(null);

    const { data, error } = await supabase
      .from("reports")
      .select("id, generated_at")
      .eq("website_id", websiteId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setViewingReportFor(null);

    if (error) {
      setActionError(error.message);
      return;
    }

    if (!data?.id) {
      setActionError("No report found for this website yet. Run a scan first.");
      return;
    }

    openReportUrl(String(data.id), openInNewTab);
  };

  const openLatestReport = async (website: any, openInNewTab = false) => {
    const existingId = website?.latest_report_id ?? null;
    if (existingId) {
      openReportUrl(String(existingId), openInNewTab);
      return;
    }
    await handleViewReport(String(website.id), openInNewTab);
  };

  const openComparisonDialog = async (website: any) => {
    if (!user) return;

    setComparisonOpen(true);
    setComparisonWebsite(website);
    setComparisonReports([]);
    setSelectedComparisonReportIds([]);
    setComparisonError(null);
    setComparisonReady(false);
    setComparisonLoading(true);

    const { data, error } = await supabase
      .from("reports")
      .select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, recommendations, generated_at, report_level, is_cached")
      .eq("website_id", website.id)
      .order("generated_at", { ascending: false })
      .limit(20);

    setComparisonLoading(false);

    if (error) {
      setComparisonError(error.message);
      return;
    }

    const reports = ((data ?? []) as ComparableReport[]).filter((report) => report.website_id === website.id);
    setComparisonReports(reports);

    if (reports.length < 2) {
      setComparisonError("This website needs at least 2 reports before comparison is available.");
    }
  };

  const toggleComparisonReport = (report: ComparableReport) => {
    setComparisonReady(false);
    setComparisonError(null);

    if (!comparisonWebsite || report.website_id !== comparisonWebsite.id) {
      setComparisonError("You can only compare reports from the same website.");
      return;
    }

    setSelectedComparisonReportIds((current) => {
      if (current.includes(report.id)) {
        return current.filter((id) => id !== report.id);
      }

      if (current.length >= MAX_COMPARISON_REPORTS) {
        setComparisonError("You can select up to 3 reports at a time.");
        return current;
      }

      return [...current, report.id];
    });
  };

  const startComparison = () => {
    if (selectedComparisonReportIds.length < 2) {
      setComparisonError("Select 2 or 3 reports from this website to compare.");
      return;
    }

    if (selectedComparisonReportIds.length > MAX_COMPARISON_REPORTS) {
      setComparisonError("You can select up to 3 reports at a time.");
      return;
    }

    setComparisonError(null);
    setComparisonReady(true);
  };

  const openComparisonDetailPage = () => {
    if (!comparisonWebsite || selectedComparisonReportIds.length < 2) return;
    navigate(
      `/dashboard/reports/compare?websiteId=${encodeURIComponent(String(comparisonWebsite.id))}&reportIds=${encodeURIComponent(
        selectedComparisonReportIds.join(",")
      )}`
    );
  };

  const formatStatusLabel = (status?: string | null) => {
    const s = (status ?? "").trim();
    if (!s) return "Pending";
    const normalized = s.toLowerCase();
    if (normalized === "needs-improvement") return "Needs Improvement";
    if (normalized === "processing") return "Processing";
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  };

  const getStatusBadge = (status?: string | null) => {
    const normalized = (status ?? "").toLowerCase();
    if (normalized === "completed") {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
    }
    if (normalized === "failed") {
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>;
    }
    if (normalized === "processing") {
      return <Badge variant="outline">Processing</Badge>;
    }

    switch (normalized) {
      case "optimized":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Optimized
          </Badge>
        );
      case "good":
        return <Badge className="bg-accent/10 text-accent hover:bg-accent/10">Good</Badge>;
      case "needs-improvement":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Needs Improvement
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const websiteOptions = useMemo(() => {
    const entries = websites.map((website) => [website.id, website.url] as const);
    entries.sort((a, b) => a[1].localeCompare(b[1]));
    return entries;
  }, [websites]);

  const filteredWebsites = useMemo(() => {
    const q = query.trim().toLowerCase();

    return websites.filter((website) => {
      if (websiteFilter !== "all" && website.id !== websiteFilter) return false;
      if (statusFilter !== "all" && normalizeStatus(website.status ?? "pending") !== statusFilter) return false;
      if (!q) return true;

      return (
        website.url.toLowerCase().includes(q) ||
        String(website.latest_report_id ?? "").toLowerCase().includes(q) ||
        String(website.status ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, statusFilter, websiteFilter, websites]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, statusFilter, websiteFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredWebsites.length / REPORTS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * REPORTS_PER_PAGE;
  const paginatedWebsites = filteredWebsites.slice(pageStart, pageStart + REPORTS_PER_PAGE);

  const selectedComparisonReports = useMemo(() => {
    const selectedIds = new Set(selectedComparisonReportIds);
    return comparisonReports
      .filter((report) => selectedIds.has(report.id))
      .sort((left, right) => {
        const leftTime = left.generated_at ? new Date(left.generated_at).getTime() : 0;
        const rightTime = right.generated_at ? new Date(right.generated_at).getTime() : 0;
        return leftTime - rightTime;
      });
  }, [comparisonReports, selectedComparisonReportIds]);

  const reportComparison = useMemo(() => buildReportComparison(selectedComparisonReports), [selectedComparisonReports]);
  const comparisonStart = reportComparison?.reports[0] ?? selectedComparisonReports[0] ?? null;
  const comparisonEnd = reportComparison?.reports[reportComparison.reports.length - 1] ?? selectedComparisonReports[selectedComparisonReports.length - 1] ?? null;
  const comparisonScoreDelta =
    typeof comparisonStart?.ai_score === "number" && typeof comparisonEnd?.ai_score === "number"
      ? comparisonEnd.ai_score - comparisonStart.ai_score
      : null;

  const deltaBadgeClass = (delta: number | null) => {
    if (delta === null || delta === 0) return "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-100";
    if (delta > 0) return "border-green-200 bg-green-100 text-green-700 hover:bg-green-100";
    return "border-red-200 bg-red-100 text-red-700 hover:bg-red-100";
  };

  const formatDelta = (delta: number | null) => {
    if (delta === null) return "N/A";
    if (delta === 0) return "No change";
    return `${delta > 0 ? "+" : ""}${delta}`;
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          Showing {pageStart + 1}-{Math.min(pageStart + REPORTS_PER_PAGE, filteredWebsites.length)} of {filteredWebsites.length} reports
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
            disabled={safeCurrentPage === 1}
          >
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <Button
              key={page}
              variant={page === safeCurrentPage ? "default" : "outline"}
              size="sm"
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            disabled={safeCurrentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
            Reports
          </h1>
          <p className="text-muted-foreground mt-2">
            Access and manage all your website reports
          </p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setNewWebsiteUrl("");
            setNewWebsiteError(null);
            setActionError(null);
            setAddOpen(true);
          }}
          disabled={!user}
        >
          <Plus className="h-4 w-4" />
          Add New Website
        </Button>
      </div>

      {!!user && (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="grid gap-5 p-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="reportSearch" className="text-sm font-medium text-primary">Search</Label>
              <Input
                id="reportSearch"
                placeholder="Search by website URL, status, or report id"
                className="h-11"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="websiteFilter" className="text-sm font-medium text-primary">Website</Label>
              <select
                id="websiteFilter"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
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
            <div className="space-y-2">
              <Label htmlFor="statusFilter" className="text-sm font-medium text-primary">Status</Label>
              <select
                id="statusFilter"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All</option>
                <option value="optimized">Optimized</option>
                <option value="good">Good</option>
                <option value="needs-improvement">Needs Improvement</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full md:w-auto"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setWebsiteFilter("all");
                }}
              >
                Clear filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {loading && <p className="text-muted-foreground">Loading reports...</p>}
        {actionError && <p className="text-sm text-red-500">{actionError}</p>}
        {renderPagination()}

        {paginatedWebsites.map((website) => {
          const latestReportAt = (website as any).latest_report_at ?? null;
          const freshReport = isFreshReport(latestReportAt);
          const reportLevel = String((website as any).latest_report_level ?? "").trim().toLowerCase();
          const creditUsedLabel =
            reportLevel === "full"
              ? (website as any).latest_is_cached
                ? "Credit used: No"
                : "Credit used: Yes"
              : "Credit used: No";
          const rescanCreditNote = freshReport
            ? "No credit used: latest report is under 24h old."
            : "Uses 1 report credit when a new full report is generated.";

          return (
          <Card
            key={website.id}
            className="border-border/40 bg-white shadow-sm transition-all hover:border-accent/25 hover:shadow-lg hover:shadow-accent/5"
            role="button"
            tabIndex={0}
            onClick={() => openLatestReport(website)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openLatestReport(website);
              }
            }}
          >
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Globe className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-primary truncate">
                        {website.url}
                      </h3>
                      <div className="mt-1 flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>Status:</span>
                          {getStatusBadge(website.status)}
                          <span className="hidden sm:inline">({formatStatusLabel(website.status)})</span>
                        </div>
                        <span className="hidden sm:inline text-muted-foreground/40">•</span>
                        <span>Last scan: {formatReadableDate(latestReportAt)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {reportPlanBadge(website)}
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                          {creditUsedLabel}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
                          Level: {reportLevel === "full" ? "Full" : "Preview"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:gap-6">
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16">
                      <svg className="h-full w-full -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#e5e7eb"
                          strokeWidth="6"
                          fill="none"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="#5B5BD6"
                          strokeWidth="6"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 28 * (website.score ?? 0) / 100} ${2 * Math.PI * 28}`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {website.score ?? "-"}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <p className="text-xs text-muted-foreground">AI Score</p>
                      {getStatusBadge(website.status)}
                    </div>
                  </div>

                  <div className="flex min-w-[180px] flex-col gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        title={rescanCreditNote}
                        className="justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReScan(website.id, website.url);
                        }}
                        disabled={isScanning === website.id || !user}
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isScanning === website.id ? "animate-spin" : ""}`} />
                        {isScanning === website.id ? "Scanning..." : "Re-Scan"}
                      </Button>
                      <p className="max-w-[220px] text-xs leading-5 text-muted-foreground">{rescanCreditNote}</p>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLatestReport(website, shouldOpenNewTab(e));
                      }}
                      disabled={!user || viewingReportFor === website.id}
                    >
                      {viewingReportFor === website.id ? "Loading..." : "View Report"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        void openComparisonDialog(website);
                      }}
                      disabled={!user}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Compare Reports
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          );
        })}
        {renderPagination()}
      </div>

      {websites.length === 0 && !loading && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">No Reports Yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add your first website to start monitoring its AI readiness
            </p>
            <Button
              className="gap-2"
              onClick={() => setAddOpen(true)}
              disabled={!user}
            >
              <Plus className="h-4 w-4" />
              Add New Website
            </Button>
          </CardContent>
        </Card>
      )}

      {websites.length > 0 && filteredWebsites.length === 0 && !loading && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">No Reports Match Your Filters</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Try clearing the search or status filters to see all of your report entries.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setWebsiteFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setNewWebsiteError(null);
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby="add-website-description">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary" style={{ fontWeight: 700 }}>
              Add a Website
            </DialogTitle>
            <DialogDescription id="add-website-description">
              Add a website URL to run a scan and keep it in your history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              placeholder="Enter your website URL"
              value={newWebsiteUrl}
              onChange={(e) => {
                setNewWebsiteUrl(e.target.value);
                if (newWebsiteError) setNewWebsiteError(null);
              }}
              onBlur={() => {
                if (!newWebsiteUrl.trim()) {
                  setNewWebsiteError(null);
                  return;
                }
                const err = validateNewWebsiteUrl(newWebsiteUrl);
                setNewWebsiteError(err || null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddWebsite();
                }
              }}
              disabled={adding}
            />
            {newWebsiteError && <p className="text-sm text-red-500">{newWebsiteError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button
              onClick={handleAddWebsite}
              disabled={adding || !newWebsiteUrl.trim()}
            >
              {adding ? "Adding..." : "Add & Scan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={comparisonOpen}
        onOpenChange={(open) => {
          setComparisonOpen(open);
          if (!open) {
            setComparisonWebsite(null);
            setComparisonReports([]);
            setSelectedComparisonReportIds([]);
            setComparisonError(null);
            setComparisonReady(false);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl" aria-describedby="compare-reports-description">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary" style={{ fontWeight: 700 }}>
              Compare Reports
            </DialogTitle>
            <DialogDescription id="compare-reports-description">
              Select 2 or 3 reports for {comparisonWebsite?.url ?? "this website"}. Cross-website comparison is disabled in Phase 1.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
            <p className="font-medium">Comparison rule</p>
            <p className="mt-1">Choose reports from this single website only. Pick exactly 2 for before/after or 3 for a short trend.</p>
          </div>

          {comparisonLoading && <p className="text-sm text-muted-foreground">Loading report history...</p>}
          {comparisonError && <p className="text-sm text-red-500">{comparisonError}</p>}

          {!comparisonLoading && comparisonReports.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <p className="font-medium text-primary">
                  Selected {selectedComparisonReportIds.length}/{MAX_COMPARISON_REPORTS}
                </p>
                <button
                  type="button"
                  className="text-muted-foreground underline underline-offset-4"
                  onClick={() => {
                    setSelectedComparisonReportIds([]);
                    setComparisonReady(false);
                    setComparisonError(null);
                  }}
                >
                  Clear selection
                </button>
              </div>

              <div className="grid gap-3">
                {comparisonReports.map((report) => {
                  const checked = selectedComparisonReportIds.includes(report.id);
                  const disabled = !checked && selectedComparisonReportIds.length >= MAX_COMPARISON_REPORTS;

                  return (
                    <button
                      key={report.id}
                      type="button"
                      className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition ${
                        checked
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border/50 bg-white hover:border-accent/40 hover:bg-accent/5"
                      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                      onClick={() => {
                        if (!disabled) toggleComparisonReport(report);
                      }}
                    >
                      <Checkbox checked={checked} disabled={disabled} aria-label={`Select report ${report.id}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-primary">{formatReadableDate(report.generated_at)}</p>
                          {getStatusBadge(report.status)}
                          <Badge variant="outline">{String(report.report_level ?? "preview") === "full" ? "Full" : "Preview"}</Badge>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">Report ID: {report.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">AI Score</p>
                        <p className="text-lg font-bold text-primary">{typeof report.ai_score === "number" ? report.ai_score : "-"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {comparisonReady && reportComparison && (
            <div className="space-y-5 rounded-2xl border border-border/50 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">Comparison Result</p>
                  <p className="text-xs text-muted-foreground">
                    {formatReadableDate(comparisonStart?.generated_at)} to {formatReadableDate(comparisonEnd?.generated_at)}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-primary">{reportComparison.resultLabel}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {reportComparison.reports.length > 2
                      ? `Using all ${reportComparison.reports.length} selected reports for score trends. Change counts compare the first and latest reports.`
                      : "Change counts compare the first and latest selected reports."}
                  </p>
                </div>
                <Badge className={deltaBadgeClass(comparisonScoreDelta)}>
                  AI Score {formatDelta(comparisonScoreDelta)}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {reportComparison.metrics.map((metric) => (
                  <div key={metric.key} className="rounded-xl border border-border/50 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                        <p className="mt-2 text-lg font-semibold text-primary">
                          {metric.firstValue ?? "-"} <span className="text-muted-foreground">→</span> {metric.lastValue ?? "-"}
                        </p>
                      </div>
                      <Badge className={deltaBadgeClass(metric.delta)}>{formatDelta(metric.delta)}</Badge>
                    </div>
                    {selectedComparisonReports.length === 3 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Trend: {metric.values.map((value) => value ?? "-").join(" → ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-700">Fixed Findings</p>
                  <p className="mt-2 text-2xl font-bold text-green-700">{reportComparison.fixedFindings.length}</p>
                </div>
                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-orange-700">New Findings</p>
                  <p className="mt-2 text-2xl font-bold text-orange-700">{reportComparison.newFindings.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Still Open</p>
                  <p className="mt-2 text-2xl font-bold text-primary">{reportComparison.persistentFindings.length}</p>
                </div>
                <div className="rounded-xl border border-accent/20 bg-accent/10 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-accent">New Recommendations</p>
                  <p className="mt-2 text-2xl font-bold text-accent">{reportComparison.addedRecommendations.length}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Key Insights</p>
                <ul className="mt-3 space-y-2 text-sm text-primary">
                  {reportComparison.insightBullets.map((insight) => (
                    <li key={insight} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {(reportComparison.fixedFindings.length > 0 || reportComparison.newFindings.length > 0) && (
                <div className="grid gap-3 md:grid-cols-2">
                  {reportComparison.fixedFindings.length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recently Fixed</p>
                      <div className="mt-3 space-y-2">
                        {reportComparison.fixedFindings.slice(0, 3).map((finding) => (
                          <div key={finding.key} className="rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                            <p className="text-sm font-medium text-green-800">{finding.title}</p>
                            <p className="text-xs text-green-700">{finding.category} · {finding.severity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reportComparison.newFindings.length > 0 && (
                    <div className="rounded-xl border border-border/50 bg-white p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Needs Attention</p>
                      <div className="mt-3 space-y-2">
                        {reportComparison.newFindings.slice(0, 3).map((finding) => (
                          <div key={finding.key} className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2">
                            <p className="text-sm font-medium text-orange-800">{finding.title}</p>
                            <p className="text-xs text-orange-700">{finding.category} · {finding.severity}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Accordion type="multiple" className="rounded-xl border border-border/50 bg-white px-4">
                <AccordionItem value="fixed">
                  <AccordionTrigger className="hover:no-underline">
                    Fixed Findings ({reportComparison.fixedFindings.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    {reportComparison.fixedFindings.length > 0 ? (
                      <div className="space-y-2">
                        {reportComparison.fixedFindings.slice(0, 5).map((finding) => (
                          <div key={finding.key} className="rounded-lg border border-green-100 bg-green-50 p-3">
                            <p className="font-medium text-green-800">{finding.title}</p>
                            <p className="mt-1 text-xs text-green-700">{finding.category} · {finding.severity}</p>
                            {finding.recommendation && <p className="mt-2 text-sm text-green-800">{finding.recommendation}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No findings were fixed between these reports.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="new">
                  <AccordionTrigger className="hover:no-underline">
                    New Findings ({reportComparison.newFindings.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    {reportComparison.newFindings.length > 0 ? (
                      <div className="space-y-2">
                        {reportComparison.newFindings.slice(0, 5).map((finding) => (
                          <div key={finding.key} className="rounded-lg border border-orange-100 bg-orange-50 p-3">
                            <p className="font-medium text-orange-800">{finding.title}</p>
                            <p className="mt-1 text-xs text-orange-700">{finding.category} · {finding.severity}</p>
                            {finding.recommendation && <p className="mt-2 text-sm text-orange-800">{finding.recommendation}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No new findings appeared in the latest report.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="open">
                  <AccordionTrigger className="hover:no-underline">
                    Still Open ({reportComparison.persistentFindings.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    {reportComparison.persistentFindings.length > 0 ? (
                      <div className="space-y-2">
                        {reportComparison.persistentFindings.slice(0, 5).map((finding) => (
                          <div key={finding.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <p className="font-medium text-primary">{finding.title}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{finding.category} · {finding.severity}</p>
                            {finding.recommendation && <p className="mt-2 text-sm text-muted-foreground">{finding.recommendation}</p>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No repeated findings are still open.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="recommendations" className="border-b-0">
                  <AccordionTrigger className="hover:no-underline">
                    Recommendation Changes ({reportComparison.addedRecommendations.length + reportComparison.removedRecommendations.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    {reportComparison.addedRecommendations.length === 0 && reportComparison.removedRecommendations.length === 0 ? (
                      <p className="text-muted-foreground">No recommendation changes were detected.</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-accent">Added</p>
                          <div className="space-y-2">
                            {reportComparison.addedRecommendations.slice(0, 5).map((recommendation) => (
                              <p key={recommendation} className="rounded-lg border border-accent/20 bg-accent/10 p-3 text-sm text-primary">
                                {recommendation}
                              </p>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Removed</p>
                          <div className="space-y-2">
                            {reportComparison.removedRecommendations.slice(0, 5).map((recommendation) => (
                              <p key={recommendation} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-muted-foreground">
                                {recommendation}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <div className="grid gap-3 sm:grid-cols-3">
                {reportComparison.reports.map((report, index) => (
                  <div key={report.id} className="rounded-xl border border-border/50 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {reportComparison.reports.length === 2 ? (index === 0 ? "Previous Report" : "Latest Report") : `Report ${index + 1}`}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-primary">{formatReadableDate(report.generated_at)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">AI</p>
                        <p className="font-semibold text-primary">{typeof report.ai_score === "number" ? report.ai_score : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SEO</p>
                        <p className="font-semibold text-primary">{typeof report.seo_score === "number" ? report.seo_score : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Technical</p>
                        <p className="font-semibold text-primary">{typeof report.technical_score === "number" ? report.technical_score : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Performance</p>
                        <p className="font-semibold text-primary">{typeof report.performance_score === "number" ? report.performance_score : "-"}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setComparisonOpen(false)}>
              Close
            </Button>
            <Button
              onClick={startComparison}
              disabled={comparisonLoading || selectedComparisonReportIds.length < 2 || selectedComparisonReportIds.length > MAX_COMPARISON_REPORTS}
            >
              Compare Selected
            </Button>
            <Button
              onClick={openComparisonDetailPage}
              disabled={!reportComparison}
            >
              Open Detail Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScanningModal
        open={scanningModalOpen}
        onOpenChange={setScanningModalOpen}
        websiteUrl={scanTargetUrl}
        isComplete={scanComplete}
        onStopScan={handleStopScan}
      />
    </div>
  );
}
