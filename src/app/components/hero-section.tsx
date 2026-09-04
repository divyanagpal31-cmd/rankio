import { ArrowRight, Sparkles, Zap, MessageCircle, Database, TrendingUp, Grid3x3, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { ScanningModal } from "./scanning-modal";
import { cancelScan, runScan } from "../services/scan-service";
import { normalizeWebsiteInput } from "../services/website-input";
import { useNavigate } from "react-router";
import { useAuth } from "../providers/auth-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { clearPendingScanUrl, isScanStateStale, readPendingScanUrl, writePendingScanUrl } from "../services/scan-staleness";

export function HeroSection() {
  const SCAN_COMPLETE_DELAY_MS = 4700;
  const STALE_SCAN_IDLE_MS = 10 * 60 * 1000;
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanComplete, setScanComplete] = useState(false);
  const [stalePromptOpen, setStalePromptOpen] = useState(false);
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const scanJobIdRef = useRef<string | null>(null);
  const lastActiveAtRef = useRef(Date.now());

  useEffect(() => {
    const markActive = () => {
      lastActiveAtRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markActive();
      }
    };

    markActive();
    window.addEventListener("focus", markActive);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const pendingUrl = readPendingScanUrl();
    if (pendingUrl) {
      clearPendingScanUrl();
      setWebsiteUrl((current) => current || pendingUrl);
    }

    return () => {
      window.removeEventListener("focus", markActive);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setUrlError("");
      return false;
    }

    try {
      normalizeWebsiteInput(value);
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "Please enter a valid website URL");
      return false;
    }

    setUrlError("");
    return true;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setWebsiteUrl(value);
    if (value.trim()) {
      validateUrl(value);
    } else {
      setUrlError("");
    }
  };

  const startScan = async () => {
    if (!validateUrl(websiteUrl)) return;
    setScanError(null);

    setIsScanning(true);
    setScanComplete(false);
    setScanningModalOpen(true);
    const scanAbortController = new AbortController();
    const scanJobId = crypto.randomUUID();
    scanAbortControllerRef.current = scanAbortController;
    scanJobIdRef.current = scanJobId;

    const normalizedWebsiteUrl = normalizeWebsiteInput(websiteUrl);

    const { data, error } = await runScan(normalizedWebsiteUrl, {
      accessToken: session?.access_token,
      requireAuth: !!user,
      signal: scanAbortController.signal,
      scanJobId,
    });
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setIsScanning(false);

    if (error) {
      if (scanAbortController.signal.aborted) return;
      setScanError(error);
      setScanningModalOpen(false);
      return;
    }

    if (data?.id) {
      try {
        sessionStorage.setItem(`rankio.report.${data.id}`, JSON.stringify(data));
      } catch {
        // ignore storage failures (quota/private mode)
      }
      setScanComplete(true);
      await new Promise((resolve) => window.setTimeout(resolve, SCAN_COMPLETE_DELAY_MS));
      setScanningModalOpen(false);
      setScanComplete(false);
      navigate(`/report?reportId=${encodeURIComponent(data.id)}`, { state: { from: "/", report: data } });
      return;
    }

    setScanningModalOpen(false);
    setScanComplete(false);
    navigate("/report");
  };

  const handleScanWebsite = async () => {
    if (isScanStateStale(lastActiveAtRef.current, STALE_SCAN_IDLE_MS)) {
      writePendingScanUrl(websiteUrl);
      setStalePromptOpen(true);
      return;
    }

    await startScan();
  };

  const handleRefreshScan = () => {
    writePendingScanUrl(websiteUrl);
    window.location.reload();
  };

  const handleStopScan = () => {
    void cancelScan(scanJobIdRef.current, { accessToken: session?.access_token });
    scanAbortControllerRef.current?.abort();
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setIsScanning(false);
    setScanComplete(false);
    setScanningModalOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScanWebsite();
    }
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1a1f3a] to-primary py-16 sm:py-20 md:py-32">
        {/* Layered background effects */}
        <div className="absolute inset-0">
          {/* Enhanced grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
          
          {/* Radial gradient overlays for depth */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          {/* Subtle particles */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white/40 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </div>
        
        <div className="container relative mx-auto px-4 md:px-6 max-w-7xl">
          <div className="grid items-center justify-items-center gap-10 md:grid-cols-2 md:gap-12 lg:gap-24">
            {/* Left side - Content */}
            <div className="w-full max-w-[40rem] space-y-8 md:max-w-none">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 border border-accent/20 backdrop-blur-sm"
              >
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-sm text-white/90">AI Visibility Intelligence Platform</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-6"
              >
                <h1
                  className="max-w-none text-[38px] font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-[#c59bff] bg-clip-text text-transparent sm:text-[48px] md:text-[42px] lg:text-[56px]"
                  style={{ lineHeight: 1.08 }}
                >
                  <span className="block">Measure Your</span>
                  <span className="block">Website's AI Visibility</span>
                </h1>
                <p className="max-w-xl text-[16px] leading-7 text-white/80 sm:text-[18px] md:max-w-[34rem] md:text-[17px] lg:text-[20px]">
                  Rankio analyzes your website the way modern AI search engines and assistants do. Get a detailed AI Visibility Report with actionable recommendations to improve how your business is understood, trusted, and recommended by AI.
                </p>
              </motion.div>

              {/* Input form */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="space-y-4 text-center lg:text-left"
              >
                <div className="space-y-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
                    <Input
                      type="url"
                      placeholder="Enter your website URL"
                      className={`h-12 w-full px-4 py-3 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-accent text-base sm:flex-1 ${
                        urlError ? "border-red-400 focus:border-red-400" : ""
                      }`}
                      value={websiteUrl}
                      onChange={handleUrlChange}
                      onKeyPress={handleKeyPress}
                    />
                    <Button 
                      size="lg"
                      className="w-full gap-2 disabled:cursor-not-allowed sm:w-auto"
                      style={{ fontWeight: 600 }}
                      onClick={handleScanWebsite}
                      disabled={!websiteUrl.trim() || !!urlError || isScanning}
                    >
                      {isScanning ? "Scanning..." : "Generate My AI Report"}
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                  {urlError && (
                    <p className="text-red-300 text-sm text-center lg:text-left">{urlError}</p>
                  )}
                  {scanError && (
                    <p className="text-red-300 text-sm text-center lg:text-left">{scanError}</p>
                  )}
                </div>
                <p className="text-sm text-white/60">
                  Free summary • No credit card required
                </p>
                <a href="#sample-report" className="text-white/90 hover:text-white text-sm font-medium underline underline-offset-4 inline-block">
                  See Sample AI Visibility Report
                </a>
              </motion.div>
            </div>

            {/* Right side - Dynamic AI Intelligence Display */}
            <div className="hidden w-full justify-center md:flex md:mt-2 lg:mt-0 lg:ml-12">
              <div className="relative w-full max-w-2xl px-8 md:scale-[0.95] lg:max-w-none lg:px-0 lg:scale-100">
                {/* Main central glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-purple-500/20 to-accent/30 blur-3xl"></div>
                
                {/* Main Score Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                className="relative z-20 mx-auto mt-12 max-w-full overflow-visible rounded-2xl border border-white/20 bg-white/95 px-6 py-6 shadow-2xl backdrop-blur-xl sm:mt-16 sm:max-w-xl sm:px-8 sm:py-8 lg:mt-0 lg:max-w-none lg:px-10 lg:py-10"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm text-muted-foreground" style={{ fontWeight: 600 }}>AI Visibility Score</h3>
                      <span className="rounded bg-accent/10 px-2 py-1 text-xs font-semibold text-accent">LIVE</span>
                    </div>
                    
                    {/* Circular Score */}
                    <div className="flex items-center justify-center">
                      <div className="relative h-40 w-40 sm:h-44 sm:w-44">
                        {/* Background circle */}
                        <svg className="h-full w-full -rotate-90">
                          <circle
                            cx="88"
                            cy="88"
                            r="80"
                            stroke="#e5e7eb"
                            strokeWidth="12"
                            fill="none"
                          />
                          {/* Progress circle */}
                          <motion.circle
                            cx="88"
                            cy="88"
                            r="80"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ strokeDasharray: `0 ${2 * Math.PI * 80}` }}
                            animate={{ strokeDasharray: `${2 * Math.PI * 80 * 0.72} ${2 * Math.PI * 80}` }}
                            transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#5B5BD6" />
                              <stop offset="100%" stopColor="hsl(var(--accent))" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* Score text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="text-4xl text-primary sm:text-5xl" 
                            style={{ fontWeight: 700 }}
                          >
                            72
                          </motion.span>
                          <span className="text-sm text-muted-foreground">/100</span>
                        </div>
                      </div>
                    </div>

                    {/* Category breakdown */}
                    <div className="space-y-3 pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Technical Foundation</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "80%" }}
                              transition={{ duration: 1, delay: 1 }}
                              className="h-full bg-accent"
                            />
                          </div>
                          <span className="text-sm text-primary" style={{ fontWeight: 600 }}>84</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">AI Visibility</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "60%" }}
                              transition={{ duration: 1, delay: 1.1 }}
                              className="h-full bg-accent"
                            />
                          </div>
                          <span className="text-sm text-primary" style={{ fontWeight: 600 }}>68</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">UX Clarity</span>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: "70%" }}
                              transition={{ duration: 1, delay: 1.2 }}
                              className="h-full bg-accent"
                            />
                          </div>
                          <span className="text-sm text-primary" style={{ fontWeight: 600 }}>71</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating Intelligence Cards */}
                
                {/* PageSpeed Score - Top Left */}
                <motion.div
                  initial={{ opacity: 0, x: -20, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute -left-8 -top-12 z-30 hidden rounded-xl border border-purple-200/50 bg-white/80 p-3 shadow-lg backdrop-blur-xl md:block xl:block"
                  style={{
                    boxShadow: "0 8px 32px rgba(91, 91, 214, 0.15)"
                  }}
                >
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-primary">Content</div>
                      <div className="text-xs font-medium text-primary">Understanding</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* AEO Optimization - Top Right */}
                <motion.div
                  initial={{ opacity: 0, x: 20, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="absolute -top-[2rem] -right-[1rem] z-30 hidden w-[132px] rounded-2xl border border-accent/30 bg-white/80 p-3 shadow-lg backdrop-blur-xl md:block xl:block"
                  style={{
                    boxShadow: "0 8px 32px rgba(91, 91, 214, 0.15)"
                  }}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-primary">Structured</div>
                      <div className="text-xs font-medium text-primary">Data</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Structured Data - Middle Left */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="absolute top-1/3 -left-4 z-30 hidden w-[112px] -translate-y-1/2 rounded-2xl border border-accent/20 bg-white/80 p-3 shadow-lg backdrop-blur-xl md:block xl:block"
                  style={{
                    boxShadow: "0 8px 32px rgba(91, 91, 214, 0.15)"
                  }}
                >
                  <motion.div
                    animate={{ x: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-primary">Brand</div>
                      <div className="text-xs font-medium text-primary">Identity</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* SEO Health - Middle Right */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  className="absolute top-1/2 -right-4 z-30 hidden w-[122px] -translate-y-1/2 rounded-2xl border border-green-200/50 bg-white/80 p-3 shadow-lg backdrop-blur-xl md:block xl:block"
                  style={{
                    boxShadow: "0 8px 32px rgba(91, 91, 214, 0.15)"
                  }}
                >
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-primary">Technical</div>
                      <div className="text-xs font-medium text-primary">Foundation</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* UX Clarity - Bottom Left */}
                <motion.div
                  initial={{ opacity: 0, x: -20, y: -20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  className="absolute -bottom-8 -left-12 z-30 hidden w-[118px] rounded-2xl border border-indigo-200/50 bg-white/80 p-3 shadow-lg backdrop-blur-xl md:block xl:block"
                  style={{
                    boxShadow: "0 8px 32px rgba(91, 91, 214, 0.15)"
                  }}
                >
                  <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Grid3x3 className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 leading-tight">
                      <div className="text-[11px] font-medium text-primary">Citation</div>
                      <div className="text-[11px] font-medium text-primary">Visibility</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* AI Scan Badge - Bottom Right */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  className="absolute -bottom-6 right-4 z-30 hidden rounded-full bg-gradient-to-r from-accent to-purple-600 px-4 py-2 shadow-lg md:block xl:block"
                  style={{
                    boxShadow: "0 8px 32px rgba(91, 91, 214, 0.3)"
                  }}
                >
                  <motion.div
                    animate={{ 
                      boxShadow: [
                        "0 0 0 0 rgba(91, 91, 214, 0.4)",
                        "0 0 0 8px rgba(91, 91, 214, 0)",
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center gap-2"
                  >
                    <Activity className="h-4 w-4 text-white" />
                    <span className="text-xs text-white font-semibold">AI Scanning...</span>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScanningModal
        open={scanningModalOpen}
        onOpenChange={setScanningModalOpen}
        websiteUrl={websiteUrl}
        isComplete={scanComplete}
        onStopScan={handleStopScan}
      />

      <AlertDialog open={stalePromptOpen} onOpenChange={setStalePromptOpen}>
        <AlertDialogContent className="border border-white/10 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Refresh before scanning?</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              This page has been idle for a while. Refreshing will re-sync the session state before we start the scan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setStalePromptOpen(false);
                void startScan();
              }}
            >
              Scan anyway
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRefreshScan}>Refresh page</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
