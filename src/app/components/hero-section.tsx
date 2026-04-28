import { ArrowRight, Sparkles, Zap, MessageCircle, Database, TrendingUp, Grid3x3, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "motion/react";
import { useState } from "react";
import { ScanningModal } from "./scanning-modal";
import { runScan } from "../services/scan-service";
import { useNavigate } from "react-router";

export function HeroSection() {
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setUrlError("");
      return false;
    }

    // Regular expression for URL validation
    const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    if (!urlPattern.test(value)) {
      setUrlError("Please enter a valid website URL");
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

  const handleScanWebsite = async () => {
    if (!validateUrl(websiteUrl)) return;
    setScanError(null);
    setIsScanning(true);

    let modalOpened = false;
    const modalTimer = window.setTimeout(() => {
      modalOpened = true;
      setScanningModalOpen(true);
    }, 900);

    const { data, error, errorCode, limit, upgradeUrl } = await runScan(websiteUrl);
    window.clearTimeout(modalTimer);
    setIsScanning(false);

    if (error) {
      if (errorCode === "SCAN_LIMIT_REACHED") {
        if (modalOpened) setScanningModalOpen(false);
        navigate(upgradeUrl || "/dashboard/subscription", { state: { reason: "scan_limit", limit: limit ?? 3 } });
        return;
      }
      setScanError(error);
      if (modalOpened) setScanningModalOpen(false);
      return;
    }

    if (data?.id) {
      try {
        sessionStorage.setItem(`rankio.report.${data.id}`, JSON.stringify(data));
      } catch {
        // ignore storage failures (quota/private mode)
      }
      if (modalOpened) setScanningModalOpen(false);
      navigate(`/report?reportId=${encodeURIComponent(data.id)}`, { state: { from: "/", report: data } });
      return;
    }

    if (modalOpened) setScanningModalOpen(false);
    navigate("/report");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleScanWebsite();
    }
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1a1f3a] to-primary py-24 md:py-32">
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
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-24 items-center justify-items-center m-[0px]">
            {/* Left side - Content */}
            <div className="space-y-8 w-full max-w-xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 border border-accent/20 backdrop-blur-sm"
              >
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-sm text-white/90">AI-Powered Website Intelligence</span>
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-6"
              >
                <h1 className="tracking-tight bg-gradient-to-r from-white via-blue-200 to-purple-400 bg-clip-text text-transparent text-[48px]" style={{ fontWeight: 700, lineHeight: 1.1 }}>Is Your Website AI-Ready for the Future of Search?</h1>
                <p className="text-white/80 max-w-xl text-[20px]" style={{ lineHeight: 1.5 }}>
                  Rankio.ai analyzes your website's structure, SEO signals, and user clarity — helping you stay visible across search engines and AI assistants.
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
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-center lg:justify-start">
                    <Input
                      type="url"
                      placeholder="https://yourwebsite.com"
                      className={`flex-1 h-14 px-5 py-4 bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-accent text-base ${
                        urlError ? "border-red-400 focus:border-red-400" : ""
                      }`}
                      value={websiteUrl}
                      onChange={handleUrlChange}
                      onKeyPress={handleKeyPress}
                    />
                    <Button 
                      className="h-14 px-8 bg-accent hover:bg-[#4a4ac0] text-white gap-2 shadow-lg shadow-accent/30 text-base disabled:opacity-50 disabled:cursor-not-allowed" 
                      style={{ fontWeight: 600 }}
                      onClick={handleScanWebsite}
                      disabled={!websiteUrl.trim() || !!urlError || isScanning}
                    >
                      {isScanning ? "Scanning..." : "Scan My Website"}
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
                  Free scan • No credit card required
                </p>
                <a href="#sample-report" className="text-white/90 hover:text-white text-sm font-medium underline underline-offset-4 inline-block">
                  View Sample Report
                </a>
              </motion.div>
            </div>

            {/* Right side - Dynamic AI Intelligence Display */}
            <div className="lg:flex justify-center w-full lg:ml-12">
              <div className="relative w-full max-w-md">
                {/* Main central glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-purple-500/20 to-accent/30 blur-3xl"></div>
                
                {/* Main Score Card */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="relative bg-white/95 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl z-10 max-w-xs mx-auto mt-16 lg:mt-0 lg:max-w-none lg:p-8"
                >
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm text-muted-foreground" style={{ fontWeight: 600 }}>AI READINESS SCORE</h3>
                      <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded font-semibold">LIVE</span>
                    </div>
                    
                    {/* Circular Score */}
                    <div className="flex items-center justify-center">
                      <div className="relative h-44 w-44">
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
                              <stop offset="100%" stopColor="#7B7BF6" />
                            </linearGradient>
                          </defs>
                        </svg>
                        
                        {/* Score text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <motion.span 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.8 }}
                            className="text-5xl text-primary" 
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
                        <span className="text-sm text-muted-foreground">SEO Foundation</span>
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
                        <span className="text-sm text-muted-foreground">AI Readiness</span>
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
                  className="absolute -top-12 -left-8 bg-white/80 backdrop-blur-xl border border-purple-200/50 rounded-xl p-3 shadow-lg z-20"
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
                      <div className="text-xs text-muted-foreground font-medium">PageSpeed</div>
                      <div className="text-lg font-bold text-primary">92</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* AEO Optimization - Top Right */}
                <motion.div
                  initial={{ opacity: 0, x: 20, y: 20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="absolute -top-4 -right-12 bg-white/80 backdrop-blur-xl border border-accent/30 rounded-xl p-3 shadow-lg z-20"
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
                      <div className="text-xs text-muted-foreground font-medium">AEO</div>
                      <div className="text-sm font-semibold text-accent">Optimized</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* Structured Data - Middle Left */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  className="absolute top-1/3 -left-4 lg:-left-16 bg-white/80 backdrop-blur-xl border border-blue-200/50 rounded-xl p-3 shadow-lg z-20"
                  style={{
                    boxShadow: "0 8px 32px rgba(91, 91, 214, 0.15)"
                  }}
                >
                  <motion.div
                    animate={{ x: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="flex items-center gap-2"
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">Schema</div>
                      <div className="text-sm font-semibold text-blue-600">Valid</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* SEO Health - Middle Right */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.9 }}
                  className="absolute top-1/2 -right-4 lg:-right-14 bg-white/80 backdrop-blur-xl border border-green-200/50 rounded-xl p-3 shadow-lg z-20"
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
                      <div className="text-xs text-muted-foreground font-medium">SEO</div>
                      <div className="text-lg font-bold text-green-600">A+</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* UX Clarity - Bottom Left */}
                <motion.div
                  initial={{ opacity: 0, x: -20, y: -20 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 1 }}
                  className="absolute -bottom-8 -left-12 bg-white/80 backdrop-blur-xl border border-indigo-200/50 rounded-xl p-3 shadow-lg z-20"
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
                    <div>
                      <div className="text-xs text-muted-foreground font-medium">UX</div>
                      <div className="text-sm font-semibold text-indigo-600">Clear</div>
                    </div>
                  </motion.div>
                </motion.div>

                {/* AI Scan Badge - Bottom Right */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 1.1 }}
                  className="absolute -bottom-6 right-4 bg-gradient-to-r from-accent to-purple-600 rounded-full px-4 py-2 shadow-lg z-20"
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

      <ScanningModal open={scanningModalOpen} onOpenChange={setScanningModalOpen} websiteUrl={websiteUrl} />
    </>
  );
}
