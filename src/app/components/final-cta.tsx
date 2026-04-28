import { ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ScanningModal } from "./scanning-modal";
import { runScan } from "../services/scan-service";

export function FinalCTA() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const navigate = useNavigate();

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setError("");
      return false;
    }

    // Regular expression for URL validation
    const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    if (!urlPattern.test(value)) {
      setError("Please enter a valid website URL");
      return false;
    }
    
    setError("");
    return true;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    if (value.trim()) {
      validateUrl(value);
    } else {
      setError("");
    }
  };

  const handleStartScan = () => {
    if (!validateUrl(url)) return;
    setScanError(null);
    setIsScanning(true);

    let modalOpened = false;
    const modalTimer = window.setTimeout(() => {
      modalOpened = true;
      setScanningModalOpen(true);
    }, 900);

    runScan(url).then(({ data, error: scanErr, errorCode, limit, upgradeUrl }) => {
      window.clearTimeout(modalTimer);
      setIsScanning(false);
      if (scanErr) {
        if (errorCode === "SCAN_LIMIT_REACHED") {
          if (modalOpened) setScanningModalOpen(false);
          navigate(upgradeUrl || "/dashboard/subscription", { state: { reason: "scan_limit", limit: limit ?? 3 } });
          return;
        }
        setScanError(scanErr);
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
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleStartScan();
    }
  };

  return (
    <>
      <section className="py-20 md:py-28 bg-gradient-to-br from-primary via-primary to-[#1a1f3a]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Headline */}
          <div className="space-y-4">
            <h2 className="text-3xl md:text-5xl text-white" style={{ fontWeight: 700, lineHeight: 1.2 }}>
              Ready to Make Your Website AI-Ready?
            </h2>
            <p className="text-lg md:text-xl text-white/80" style={{ lineHeight: 1.5 }}>
              Scan your site in minutes and receive a structured AI-readiness report.
            </p>
            {scanError && <p className="text-red-300 text-sm mt-2 text-left">{scanError}</p>}
          </div>

          {/* Input form */}
          <div className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={url}
                  onChange={handleUrlChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder:text-white/50 focus:bg-white/20 focus:border-white/40 text-base px-[20px] py-[28px] ${
                    error ? "border-red-400 focus:border-red-400" : ""
                  }`}
                />
                {error && (
                  <p className="text-red-300 text-sm mt-2 text-left">{error}</p>
                )}
              </div>
              <Button 
                onClick={handleStartScan}
                disabled={!url.trim() || !!error || isScanning}
                className="h-14 px-8 bg-white text-primary hover:bg-white/90 gap-2 disabled:opacity-50 disabled:cursor-not-allowed" 
                style={{ fontWeight: 600 }}
              >
                {isScanning ? "Scanning..." : "Start Free Scan"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-white/70 mt-4">
              Free forever • No credit card required • Results in 60 seconds
            </p>
          </div>
          </div>
        </div>
      </section>
      <ScanningModal open={scanningModalOpen} onOpenChange={setScanningModalOpen} websiteUrl={url} />
    </>
  );
}
