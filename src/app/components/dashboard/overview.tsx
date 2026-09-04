import { useRef, useState } from "react";
import { ArrowUpRight, Globe, TrendingUp, FileText, CreditCard, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useStats } from "../../services/data-hooks";
import { useAuth } from "../../providers/auth-provider";
import { cancelScan, runScan } from "../../services/scan-service";
import { normalizeWebsiteInput } from "../../services/website-input";
import { ScanningModal } from "../scanning-modal";
import { Link } from "react-router";
import { useLocation, useNavigate } from "react-router";

export function Overview() {
  const SCAN_COMPLETE_DELAY_MS = 4700;
  const { stats, loading } = useStats();
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [newWebsiteError, setNewWebsiteError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [scanTargetUrl, setScanTargetUrl] = useState("");
  const [scanComplete, setScanComplete] = useState(false);
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const scanJobIdRef = useRef<string | null>(null);

  const validateNewWebsiteUrl = (value: string) => {
    if (!value.trim()) return "Website URL is required";
    try {
      normalizeWebsiteInput(value);
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : "Please enter a valid website URL";
    }
  };

  const openAddWebsite = () => {
    setNewWebsiteUrl("");
    setNewWebsiteError(null);
    setActionError(null);
    setAddOpen(true);
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

    const { data, error } = await runScan(normalized, {
      accessToken: session?.access_token,
      requireAuth: true,
      signal: scanAbortController.signal,
      scanJobId,
    });
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;

    setAdding(false);

    if (error) {
      if (scanAbortController.signal.aborted) return;
      setScanningModalOpen(false);
      setActionError(error);
      return;
    }

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
    setScanComplete(false);
    setScanningModalOpen(false);
  };

  const cards = [
    {
      title: "Total Websites Scanned",
      value: String(stats.totalWebsites ?? 0),
      icon: Globe,
      color: "from-accent to-accent/70",
    },
    {
      title: "Average AI Score",
      value: String(stats.averageScore ?? 0),
      suffix: "/100",
      icon: TrendingUp,
      color: "from-accent to-purple-600",
    },
    {
      title: "Active Plan",
      value: stats.activePlan ?? "No active plan",
      icon: CreditCard,
      color: "from-green-500 to-emerald-600",
    },
    {
      title: "Reports Generated",
      value: String(stats.reportsGenerated ?? 0),
      icon: FileText,
      color: "from-orange-500 to-amber-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
            Welcome back, Alex
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor your AI visibility and website performance.
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={openAddWebsite}
          disabled={!user}
        >
          <Plus className="h-4 w-4" />
          Add New Website
        </Button>
      </div>
      {actionError && <p className="text-sm text-red-500">{actionError}</p>}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="relative overflow-hidden border-accent/20 hover:border-accent/40 transition-all hover:shadow-lg hover:shadow-accent/5"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                <CardTitle className="text-sm font-medium leading-5 text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="pb-5 pt-0">
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-semibold leading-none text-primary">
                    {loading ? "…" : stat.value}
                  </span>
                  {stat.suffix && (
                    <span className="mb-0.5 text-sm text-muted-foreground">{stat.suffix}</span>
                  )}
                </div>
              </CardContent>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />
            </Card>
          );
        })}
      </div>

      {/* Recent Activity Section */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-primary" style={{ fontWeight: 600 }}>
              Recent Activity
            </CardTitle>
            <Link
              to="/dashboard/reports"
              className="inline-flex items-center text-sm font-medium text-accent hover:text-accent/80"
            >
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(stats.recentScans ?? []).length === 0 ? (
              <div className="p-6 rounded-lg border border-border/40 text-sm text-muted-foreground">
                No recent activity yet. Run a scan to generate your first report.
              </div>
            ) : (
              (stats.recentScans ?? []).map((scan, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border border-border/40 hover:border-accent/20 hover:bg-accent/5 transition-all gap-4"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-primary">{scan.url}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{scan.date}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* AI Score Circle */}
                    <div className="flex items-center gap-2">
                      <div className="relative h-12 w-12">
                        <svg className="h-full w-full -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="#e5e7eb"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke="#5B5BD6"
                            strokeWidth="4"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 20 * (scan.score / 100)} ${2 * Math.PI * 20}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">{scan.score}</span>
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <p className="text-xs text-muted-foreground">AI Score</p>
                        <p
                          className={`text-sm font-medium ${
                            scan.status === "Optimized"
                              ? "text-green-600"
                              : scan.status === "Good"
                                ? "text-accent"
                                : "text-orange-600"
                          }`}
                        >
                          {scan.status}
                        </p>
                      </div>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      disabled={!scan.reportId}
                    >
                      <Link to={scan.reportId ? `/report?reportId=${encodeURIComponent(scan.reportId)}` : "#"}>
                        View Report
                      </Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setNewWebsiteError(null);
        }}
      >
        <DialogContent className="sm:max-w-md" aria-describedby="dashboard-add-website-description">
          <DialogHeader>
            <DialogTitle className="text-xl text-primary" style={{ fontWeight: 700 }}>
              Add a Website
            </DialogTitle>
            <DialogDescription id="dashboard-add-website-description">
              Add a website URL to run a scan and keep it in your history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="dashboardWebsiteUrl">Website URL</Label>
            <Input
              id="dashboardWebsiteUrl"
              placeholder="Enter your website URL"
              value={newWebsiteUrl}
              onChange={(event) => {
                setNewWebsiteUrl(event.target.value);
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
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
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
