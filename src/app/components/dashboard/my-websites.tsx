import { useState } from "react";
import { Globe, RefreshCw, Plus, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { useWebsites } from "../../services/data-hooks";
import { useAuth } from "../../providers/auth-provider";
import { runScan } from "../../services/scan-service";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useLocation, useNavigate } from "react-router";

function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  const url = new URL(u);
  url.hash = "";
  if (url.pathname === "/") url.pathname = "";
  return url.toString().replace(/\/$/, "");
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
}

export function MyWebsites() {
  const { websites, loading, error, refetch } = useWebsites();
  const { user } = useAuth();
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

  const handleReScan = async (id: string, url: string) => {
    if (!user) return;
    setIsScanning(id);
    setActionError(null);

    setScanTargetUrl(url);

    let modalOpened = false;
    const modalTimer = window.setTimeout(() => {
      modalOpened = true;
      setScanningModalOpen(true);
    }, 900);

    // Call Edge Function; it will return a cached report if fresh (<12h)
    const { data, error, errorCode, limit, upgradeUrl } = await runScan(url);
    window.clearTimeout(modalTimer);
    if (error) {
      if (modalOpened) setScanningModalOpen(false);
      if (errorCode === "SCAN_LIMIT_REACHED") {
        const from = `${location.pathname}${location.search}`;
        navigate(upgradeUrl || "/dashboard/subscription", {
          state: { from, reason: "scan_limit", limit: limit ?? 3 },
        });
        setIsScanning(null);
        return;
      }
      setActionError(error);
    } else {
      refetch();
      const from = `${location.pathname}${location.search}`;
      if (modalOpened) setScanningModalOpen(false);
      navigate(data?.id ? `/report?reportId=${encodeURIComponent(data.id)}` : "/report", {
        state: { from, report: data },
      });
    }

    setIsScanning(null);
  };

  const validateNewWebsiteUrl = (value: string) => {
    if (!value.trim()) return "Website URL is required";
    try {
      normalizeUrl(value);
      return "";
    } catch {
      return "Please enter a valid website URL";
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

    const normalized = normalizeUrl(newWebsiteUrl);

    setAddOpen(false);
    setNewWebsiteUrl("");

    setScanTargetUrl(normalized);

    let modalOpened = false;
    const modalTimer = window.setTimeout(() => {
      modalOpened = true;
      setScanningModalOpen(true);
    }, 900);
    const { data, error: scanErr, errorCode, limit, upgradeUrl } = await runScan(normalized);
    window.clearTimeout(modalTimer);
    setAdding(false);

    if (scanErr) {
      if (modalOpened) setScanningModalOpen(false);
      if (errorCode === "SCAN_LIMIT_REACHED") {
        const from = `${location.pathname}${location.search}`;
        navigate(upgradeUrl || "/dashboard/subscription", {
          state: { from, reason: "scan_limit", limit: limit ?? 3 },
        });
        return;
      }
      setActionError(scanErr);
      return;
    }

    refetch();
    const from = `${location.pathname}${location.search}`;
    if (modalOpened) setScanningModalOpen(false);
    navigate(data?.id ? `/report?reportId=${encodeURIComponent(data.id)}` : "/report", {
      state: { from, report: data },
    });
  };

  const handleViewReport = async (websiteId: string) => {
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

    const from = `${location.pathname}${location.search}`;
    navigate(`/report?reportId=${encodeURIComponent(data.id)}`, { state: { from } });
  };

  const openLatestReport = async (website: any) => {
    const existingId = website?.latest_report_id ?? null;
    if (existingId) {
      const from = `${location.pathname}${location.search}`;
      navigate(`/report?reportId=${encodeURIComponent(existingId)}`, { state: { from } });
      return;
    }
    await handleViewReport(String(website.id));
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
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Good</Badge>;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl text-primary" style={{ fontWeight: 700 }}>
            My Websites
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage and monitor all your scanned websites
          </p>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
        <Button
          className="bg-accent hover:bg-accent/90 text-white gap-2"
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

      <div className="grid gap-4">
        {loading && <p className="text-muted-foreground">Loading websites...</p>}
        {actionError && <p className="text-sm text-red-500">{actionError}</p>}

        {websites.map((website) => (
          <Card
            key={website.id}
            className="border-border/40 hover:border-accent/20 transition-all hover:shadow-lg hover:shadow-accent/5"
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
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
                        <span>Last scan: {formatDate((website as any).latest_report_at ?? null)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 lg:gap-6">
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

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-accent/20 text-accent hover:bg-accent hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReScan(website.id, website.url);
                      }}
                      disabled={isScanning === website.id || !user}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isScanning === website.id ? "animate-spin" : ""}`} />
                      {isScanning === website.id ? "Scanning..." : "Re-Scan"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openLatestReport(website);
                      }}
                      disabled={!user || viewingReportFor === website.id}
                    >
                      {viewingReportFor === website.id ? "Loading..." : "View Report"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {websites.length === 0 && !loading && (
        <Card className="border-dashed border-2 border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">No websites yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add your first website to start monitoring its AI readiness
            </p>
            <Button
              className="bg-accent hover:bg-accent/90 text-white gap-2"
              onClick={() => setAddOpen(true)}
              disabled={!user}
            >
              <Plus className="h-4 w-4" />
              Add Website
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
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
              placeholder="example.com"
              value={newWebsiteUrl}
              onChange={(e) => {
                setNewWebsiteUrl(e.target.value);
                if (newWebsiteError) setNewWebsiteError(null);
              }}
              onBlur={() => {
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
              className="bg-accent hover:bg-accent/90 text-white"
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
      />
    </div>
  );
}
