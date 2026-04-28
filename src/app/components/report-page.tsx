import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft,
  RefreshCw,
  Lock,
  LayoutDashboard,
  Settings,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import darkLogo from "../../assets/ec37bb065d49c41d8d194954cdc4226b5e7e1837.png";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useReports } from "../services/data-hooks";
import { useAuth } from "../providers/auth-provider";
import { AuthModal } from "./auth-modal";
import { Footer } from "./footer";
import { supabase } from "../../lib/supabase";
import { runScan } from "../services/scan-service";

const fallbackCategoryScores = [
  { category: "Performance", score: 84, color: "bg-accent" },
  { category: "SEO", score: 68, color: "bg-purple-500" },
  { category: "Best Practices", score: 75, color: "bg-blue-500" },
];

const fallbackInsights = [
  {
    title: "Missing Schema Markup",
    severity: "High",
    description: "Your website is missing essential structured data that helps search engines and AI assistants understand your content.",
    recommendation: "Add Organization and WebPage schema to improve visibility.",
  },
  {
    title: "Slow Page Load Speed",
    severity: "Medium",
    description: "Page load time is 3.2 seconds. Faster sites rank better and provide better user experience.",
    recommendation: "Optimize images and enable browser caching.",
  },
  {
    title: "Good Mobile Optimization",
    severity: "Good",
    description: "Your website is well-optimized for mobile devices with responsive design.",
    recommendation: "Continue monitoring mobile performance metrics.",
  },
];

function getStatusIcon(status: string) {
  if (status === "success") return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  if (status === "warning") return <AlertTriangle className="h-5 w-5 text-amber-600" />;
  if (status === "error") return <XCircle className="h-5 w-5 text-red-600" />;
  return <Lock className="h-5 w-5 text-gray-400" />;
}

function getSeverityColor(severity: string) {
  if (severity === "Critical") return "text-red-600 bg-red-50";
  if (severity === "High") return "text-orange-600 bg-orange-50";
  if (severity === "Medium") return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}

function formatMs(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

function formatCls(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(2);
}

function metricCategoryLabel(value?: string | null) {
  const v = (value ?? "").toUpperCase();
  if (v === "FAST") return "Good";
  if (v === "AVERAGE" || v === "MODERATE") return "Needs Improvement";
  if (v === "SLOW") return "Poor";
  return value ?? "-";
}

function metricCategoryClass(value?: string | null) {
  const v = (value ?? "").toUpperCase();
  if (v === "FAST") return "text-green-700 bg-green-100";
  if (v === "AVERAGE" || v === "MODERATE") return "text-orange-700 bg-orange-100";
  if (v === "SLOW") return "text-red-700 bg-red-100";
  return "text-muted-foreground bg-gray-100";
}

function getCruxMetrics(raw: any) {
  const exp = raw?.loadingExperience ?? null;
  const origin = raw?.originLoadingExperience ?? null;

  const read = (source: any, key: string) => {
    const m = source?.metrics?.[key] ?? null;
    const percentile = typeof m?.percentile === "number" ? m.percentile : null;
    const category = typeof m?.category === "string" ? m.category : null;
    return { percentile, category };
  };

  const lcp = read(exp, "LARGEST_CONTENTFUL_PAINT_MS");
  const cls = read(exp, "CUMULATIVE_LAYOUT_SHIFT_SCORE");
  const inpCandidate = read(exp, "INTERACTION_TO_NEXT_PAINT_MS");
  const inp = inpCandidate.percentile != null || inpCandidate.category != null
    ? inpCandidate
    : read(exp, "FIRST_INPUT_DELAY_MS");

  const oLcp = read(origin, "LARGEST_CONTENTFUL_PAINT_MS");
  const oCls = read(origin, "CUMULATIVE_LAYOUT_SHIFT_SCORE");
  const oInpCandidate = read(origin, "INTERACTION_TO_NEXT_PAINT_MS");
  const oInp = oInpCandidate.percentile != null || oInpCandidate.category != null
    ? oInpCandidate
    : read(origin, "FIRST_INPUT_DELAY_MS");

  const field = typeof exp?.overall_category === "string" ? exp.overall_category : null;
  const originField = typeof origin?.overall_category === "string" ? origin.overall_category : null;

  return {
    hasField: Boolean(exp?.metrics),
    hasOrigin: Boolean(origin?.metrics),
    field,
    originField,
    lcp,
    inp,
    cls,
    oLcp,
    oInp,
    oCls,
  };
}

export function ReportPage() {
  const { reports } = useReports();
  const { user, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const openAuth = () => setAuthOpen(true);
  const [rescanning, setRescanning] = useState(false);
  const [rescanMessage, setRescanMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("reportId");
  const [reportById, setReportById] = useState<any | null | undefined>(undefined);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const reportFromState = (location.state as any)?.report as any | undefined;
  const backTo = (location.state as any)?.from as string | undefined;
  const backToDefault = user ? "/dashboard" : "/";

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!reportId) {
        setReportById(undefined);
        setReportError(null);
        setLoadingReport(false);
        return;
      }

      const readCached = () => {
        try {
          const raw = sessionStorage.getItem(`rankio.report.${reportId}`);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
          return null;
        }
      };

      const localReport =
        reportFromState && String(reportFromState?.id ?? "") === reportId
          ? reportFromState
          : readCached();
      const safeLocalReport =
        localReport && String(localReport?.id ?? "") === reportId ? localReport : null;

      if (safeLocalReport) {
        setReportById(safeLocalReport);
        setReportError(null);
        try {
          sessionStorage.setItem(`rankio.report.${reportId}`, JSON.stringify(safeLocalReport));
        } catch {
          // ignore storage failures (quota/private mode)
        }
        // Guests often can't read the row back due to RLS; keep the in-memory report.
        if (!user) {
          setLoadingReport(false);
          return;
        }
      } else {
        setReportById(undefined);
      }

      setLoadingReport(true);
      setReportError(null);

      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setReportById(null);
        setReportError(error.message);
      } else {
        setReportById(data ?? (safeLocalReport ? safeLocalReport : null));
      }

      setLoadingReport(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reportId, reportFromState, user]);

  const activeReport = useMemo(
    () => (reportId ? (reportById ?? null) : reports?.[0] ?? null),
    [reportId, reportById, reports]
  );
  const crux = useMemo(() => getCruxMetrics((activeReport as any)?.raw_scan_data), [activeReport]);
  const initials =
    (user?.user_metadata?.full_name as string | undefined)?.slice(0, 2)?.toUpperCase() ||
    (user?.email ? user.email.slice(0, 2).toUpperCase() : "U");

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const headerRight = user ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-3 py-2 h-auto">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent text-white text-sm">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-primary hidden sm:block">
            {(user.user_metadata?.full_name as string) ?? user.email}
          </span>
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{(user.user_metadata?.full_name as string) ?? "Account"}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/dashboard")}>
          <LayoutDashboard className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Account Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    null
  );

  const detailedRows = useMemo(() => {
    const items = ((activeReport as any)?.recommendations ?? fallbackInsights) as any;
    const arr: any[] = Array.isArray(items) ? items : fallbackInsights;

    return arr
      .map((it) => {
        const parameter = String(it?.title ?? it?.parameter ?? "").trim();
        if (!parameter) return null;

        const suggestion = String(it?.recommendation ?? it?.suggestion ?? "").trim();
        const rawSeverity = String(it?.severity ?? "").trim();
        const severity =
          rawSeverity === "Info" || rawSeverity === "Good" || rawSeverity === ""
            ? "Low"
            : rawSeverity;

        const status =
          severity === "Critical" || severity === "High"
            ? "error"
            : severity === "Medium"
              ? "warning"
              : "success";

        return { parameter, status, severity, suggestion: suggestion || parameter };
      })
      .filter(Boolean) as { parameter: string; status: string; severity: string; suggestion: string }[];
  }, [activeReport]);

  if (reportId) {
    if (reportError) {
      return (
        <>
          <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white backdrop-blur-md">
              <div className="container mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2">
                      <img src={darkLogo} alt="Rankio" className="h-8" />
                    </Link>
                  </div>
                  {headerRight}
                </div>
              </div>
            </header>

            <main className="container mx-auto px-4 md:px-6 py-8 max-w-6xl">
              <p className="text-sm text-red-600 mb-4">Failed to load report: {reportError}</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                    return;
                  }
                  navigate(backTo ?? backToDefault);
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Go back
              </button>
            </main>
          </div>
           <AuthModal
             open={authOpen}
             onOpenChange={setAuthOpen}
             redirectTo={`${location.pathname}${location.search}`}
           />
         </>
       );
     }

    if (loadingReport || reportById === undefined) {
      return (
        <>
          <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white backdrop-blur-md">
              <div className="container mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2">
                      <img src={darkLogo} alt="Rankio" className="h-8" />
                    </Link>
                  </div>
                  {headerRight}
                </div>
              </div>
            </header>

            <main className="container mx-auto px-4 md:px-6 py-8 max-w-6xl">
              <p className="text-sm text-muted-foreground mb-4">Loading report...</p>
            </main>
          </div>
           <AuthModal
             open={authOpen}
             onOpenChange={setAuthOpen}
             redirectTo={`${location.pathname}${location.search}`}
           />
         </>
       );
     }

    if (reportById === null) {
      return (
        <>
          <div className="min-h-screen bg-gray-50">
            <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white backdrop-blur-md">
              <div className="container mx-auto px-4 md:px-6">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Link to="/" className="flex items-center gap-2">
                      <img src={darkLogo} alt="Rankio" className="h-8" />
                    </Link>
                  </div>
                  {headerRight}
                </div>
              </div>
            </header>

            <main className="container mx-auto px-4 md:px-6 py-8 max-w-6xl">
              <p className="text-sm text-muted-foreground mb-4">Report not found.</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80"
                onClick={() => {
                  if (window.history.length > 1) {
                    navigate(-1);
                    return;
                  }
                  navigate(backTo ?? backToDefault);
                }}
              >
                <ArrowLeft className="h-4 w-4" /> Go back
              </button>
            </main>
          </div>
           <AuthModal
             open={authOpen}
             onOpenChange={setAuthOpen}
             redirectTo={`${location.pathname}${location.search}`}
           />
         </>
       );
     }
  }
  const displayUrl =
    (activeReport as any)?.raw_scan_data?.lighthouseResult?.finalUrl ??
    (activeReport as any)?.raw_scan_data?.id ??
    (activeReport as any)?.site ??
    "example-site.com";
  const isGuest = !user;
  const visibleDetailedRows = isGuest ? detailedRows.slice(0, 3) : detailedRows;

  const handleRescan = async () => {
    if (!user || !activeReport) return;
    if (rescanning) return;
    setRescanMessage(null);

    const generatedAtRaw = (activeReport as any)?.generated_at as string | undefined;
    const generatedAtMs = generatedAtRaw ? new Date(generatedAtRaw).getTime() : NaN;
    const isFresh =
      Number.isFinite(generatedAtMs) && Date.now() - generatedAtMs < 12 * 60 * 60 * 1000;

    if (isFresh) {
      setRescanMessage("Using the latest report (generated within the last 12 hours).");
      return;
    }

    const scanUrl =
      (activeReport as any)?.raw_scan_data?.lighthouseResult?.finalUrl ??
      (activeReport as any)?.raw_scan_data?.lighthouseResult?.requestedUrl ??
      (activeReport as any)?.site ??
      displayUrl;

    if (!/^https?:\/\//i.test(String(scanUrl ?? ""))) {
      setRescanMessage("Unable to re-scan: missing a valid URL for this report.");
      return;
    }

    setRescanning(true);
    const { data, error, errorCode, limit, upgradeUrl } = await runScan(String(scanUrl));
    setRescanning(false);

    if (error) {
      if (errorCode === "SCAN_LIMIT_REACHED") {
        const from = `${location.pathname}${location.search}`;
        navigate(upgradeUrl || "/dashboard/subscription", { state: { from, reason: "scan_limit", limit: limit ?? 3 } });
        return;
      }
      setRescanMessage(error);
      return;
    }

    if (data?.id) {
      try {
        sessionStorage.setItem(`rankio.report.${data.id}`, JSON.stringify(data));
      } catch {
        // ignore storage failures (quota/private mode)
      }
      const from = `${location.pathname}${location.search}`;
      navigate(`/report?reportId=${encodeURIComponent(data.id)}`, { state: { from, report: data } });
    }
  };

  const lighthouseCategories = (activeReport as any)?.raw_scan_data?.lighthouseResult?.categories ?? null;
  const readStoredScore = (field: string): number | null => {
    const value = (activeReport as any)?.[field];
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  const readLighthouseScore = (key: string): number | null => {
    const value = lighthouseCategories?.[key]?.score;
    return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 100) : null;
  };

  const perfScore = readStoredScore("performance_score") ?? readLighthouseScore("performance");
  const seoScore = readStoredScore("seo_score") ?? readLighthouseScore("seo");
  const bestScore = readStoredScore("technical_score") ?? readLighthouseScore("best-practices");
  const a11yScore = readStoredScore("accessibility_score") ?? readLighthouseScore("accessibility");

  const categories: { category: string; score: number | null; color: string }[] = activeReport
    ? [
        { category: "Performance", score: perfScore, color: "bg-accent" },
        { category: "SEO", score: seoScore, color: "bg-purple-500" },
        { category: "Best Practices", score: bestScore, color: "bg-blue-500" },
        { category: "Accessibility", score: a11yScore, color: "bg-green-500" },
      ]
    : fallbackCategoryScores;

  return (
    <>
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2">
                <img src={darkLogo} alt="Rankio" className="h-8" />
              </Link>
            </div>
             {headerRight}
           </div>
         </div>
       </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-8 max-w-6xl flex-1">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
              return;
            }
            if (backTo) {
              navigate(backTo);
              return;
            }
            navigate("/dashboard/websites");
          }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Report Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl text-primary mb-2" style={{ fontWeight: 700 }}>
                AI Readiness Report
              </h1>
              <p className="text-muted-foreground">
                Report for{" "}
                <span className="font-semibold">
                  {displayUrl}
                </span>
              </p>
              <p className="text-sm text-muted-foreground">
                Generated on{" "}
                {activeReport?.generated_at
                  ? new Date(activeReport.generated_at).toLocaleDateString()
                  : "Feb 23, 2026"}
              </p>
            </div>
            {!isGuest && (
              <div className="flex gap-2">
                <Button
                  className="bg-accent hover:bg-accent/90 text-white gap-2"
                  size="sm"
                  onClick={handleRescan}
                  disabled={rescanning}
                >
                  <RefreshCw className="h-4 w-4" />
                  {rescanning ? "Re-Scanning..." : "Re-Scan"}
                </Button>
              </div>
            )}
          </div>
          {rescanMessage && (
            <p className="text-sm text-muted-foreground">{rescanMessage}</p>
          )}
        </div>

        {/* Overall Score */}
        <Card className="mb-8 border-accent/20 shadow-lg shadow-accent/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
          <CardContent className="p-8 relative">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Circular Score */}
              <div className="relative h-48 w-48 flex-shrink-0">
                <svg className="h-full w-full -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#e5e7eb"
                    strokeWidth="16"
                    fill="none"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="#5B5BD6"
                    strokeWidth="16"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 88 * ((activeReport as any)?.ai_score ?? 72) / 100} ${2 * Math.PI * 88}`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl text-primary" style={{ fontWeight: 700 }}>
                    {(activeReport as any)?.ai_score ?? 72}
                  </span>
                  <span className="text-lg text-muted-foreground">/100</span>
                </div>
              </div>

              {/* Score Description */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-bold text-primary mb-3">Good Performance</h2>
                <p className="text-muted-foreground mb-4">
                  Your website shows solid AI readiness with room for improvement in several key areas.
                  Focus on structured data and page speed optimization to boost your score.
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    Mobile Friendly
                  </span>
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                    HTTPS Enabled
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                    Content Rich
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Scores */}
        <Card className="mb-8 border-border/40 relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-xl">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent className={isGuest ? "opacity-50 blur-[1px] pointer-events-none" : ""}>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {categories.map((item, index) => (
                <div key={index} className="space-y-3">
                  <div className="text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                    {item.category}
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl text-primary" style={{ fontWeight: 700 }}>
                      {item.score ?? "-"}
                    </span>
                    <span className="text-muted-foreground mb-1">/100</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{ width: `${Math.max(0, item.score ?? 0)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          {isGuest && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="text-center space-y-3">
                <div className="bg-white/80 px-4 py-2 rounded border border-border/50 text-sm text-muted-foreground font-medium">
                  Preview mode: category breakdown locked
                </div>
                <Button className="bg-accent hover:bg-accent/90 text-white" onClick={openAuth}>
                  <Lock className="h-4 w-4 mr-2" />
                  Log in to unlock
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Field Data (CrUX) */}
        <Card className="mb-8 border-border/40 relative overflow-hidden">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-xl">Real-User Field Data (CrUX)</CardTitle>
          </CardHeader>
          <CardContent className={isGuest ? "opacity-50 blur-[1px] pointer-events-none" : ""}>
            {!crux.hasField && !crux.hasOrigin ? (
              <p className="text-sm text-muted-foreground">
                Field data is not available for this URL yet (CrUX may not have enough real-user traffic).
              </p>
            ) : (
              <div className="space-y-6">
                {crux.hasField && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">This URL</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${metricCategoryClass(crux.field)}`}>
                        {metricCategoryLabel(crux.field)}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-border/40">
                        <div className="text-xs text-muted-foreground mb-1">LCP (p75)</div>
                        <div className="text-lg font-semibold text-primary">{formatMs(crux.lcp.percentile)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{metricCategoryLabel(crux.lcp.category)}</div>
                      </div>
                      <div className="p-4 rounded-lg border border-border/40">
                        <div className="text-xs text-muted-foreground mb-1">INP/FID (p75)</div>
                        <div className="text-lg font-semibold text-primary">{formatMs(crux.inp.percentile)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{metricCategoryLabel(crux.inp.category)}</div>
                      </div>
                      <div className="p-4 rounded-lg border border-border/40">
                        <div className="text-xs text-muted-foreground mb-1">CLS (p75)</div>
                        <div className="text-lg font-semibold text-primary">{formatCls(crux.cls.percentile)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{metricCategoryLabel(crux.cls.category)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {crux.hasOrigin && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-primary">Origin (whole site)</p>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${metricCategoryClass(crux.originField)}`}>
                        {metricCategoryLabel(crux.originField)}
                      </span>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg border border-border/40">
                        <div className="text-xs text-muted-foreground mb-1">LCP (p75)</div>
                        <div className="text-lg font-semibold text-primary">{formatMs(crux.oLcp.percentile)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{metricCategoryLabel(crux.oLcp.category)}</div>
                      </div>
                      <div className="p-4 rounded-lg border border-border/40">
                        <div className="text-xs text-muted-foreground mb-1">INP/FID (p75)</div>
                        <div className="text-lg font-semibold text-primary">{formatMs(crux.oInp.percentile)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{metricCategoryLabel(crux.oInp.category)}</div>
                      </div>
                      <div className="p-4 rounded-lg border border-border/40">
                        <div className="text-xs text-muted-foreground mb-1">CLS (p75)</div>
                        <div className="text-lg font-semibold text-primary">{formatCls(crux.oCls.percentile)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{metricCategoryLabel(crux.oCls.category)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          {isGuest && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded border border-border/50 text-sm text-muted-foreground font-medium">
                Preview mode: field data locked
              </div>
            </div>
          )}
        </Card>

        {/* Detailed Analysis */}
        {visibleDetailedRows.length > 0 && (
          <Card className="mb-8 border-border/40 relative overflow-hidden">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="text-xl">Detailed Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Parameter
                      </th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Severity
                      </th>
                      <th className="text-left py-3 px-4 text-sm text-muted-foreground" style={{ fontWeight: 600 }}>
                        Suggestion
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleDetailedRows.map((row, index) => (
                      <tr key={index} className="border-b border-border/30">
                        <td className="py-3 px-4 text-sm text-primary">{row.parameter}</td>
                        <td className="py-3 px-4">{getStatusIcon(row.status)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-xs px-2 py-1 rounded ${getSeverityColor(row.severity)}`}
                            style={{ fontWeight: 600 }}
                          >
                            {row.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">{row.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isGuest && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Showing a preview. Log in to view the full detailed analysis.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Insights & Recommendations */}
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Key Insights & Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {((activeReport as any)?.recommendations ?? fallbackInsights)
              .slice(0, user ? undefined : 1)
              .map((insight: any, index: number) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-border/40 hover:border-accent/20 hover:bg-accent/5 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                        insight.severity === "High"
                          ? "bg-red-100 text-red-700"
                          : insight.severity === "Medium"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {insight.severity ?? "Info"}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-primary mb-2">
                        {insight.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.description}
                      </p>
                      <p className="text-sm text-accent">
                        <strong>Recommendation:</strong> {insight.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            {isGuest && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" /> Preview only. Log in to see all recommendations.
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer variant="app" />
    </div>
    <AuthModal
      open={authOpen}
      onOpenChange={setAuthOpen}
      redirectTo={`${location.pathname}${location.search}`}
    />
    </>
  );
}
