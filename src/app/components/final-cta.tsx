import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { useRef, useState } from "react";

import { cancelScan, runScan } from "../services/scan-service";
import { useAuth } from "../providers/auth-provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScanningModal } from "./scanning-modal";

export function FinalCTA() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [scanningModalOpen, setScanningModalOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const scanAbortControllerRef = useRef<AbortController | null>(null);
  const scanJobIdRef = useRef<string | null>(null);

  const validateUrl = (value: string) => {
    if (!value.trim()) {
      setError("");
      return false;
    }

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
    setScanningModalOpen(true);
    const scanAbortController = new AbortController();
    const scanJobId = crypto.randomUUID();
    scanAbortControllerRef.current = scanAbortController;
    scanJobIdRef.current = scanJobId;

    runScan(url, {
      accessToken: session?.access_token,
      requireAuth: !!user,
      signal: scanAbortController.signal,
      scanJobId,
    }).then(({ data, error: scanErr }) => {
      scanAbortControllerRef.current = null;
      scanJobIdRef.current = null;
      setIsScanning(false);
      if (scanErr) {
        if (scanAbortController.signal.aborted) return;
        setScanError(scanErr);
        setScanningModalOpen(false);
        return;
      }
      if (data?.id) {
        try {
          sessionStorage.setItem(`rankio.report.${data.id}`, JSON.stringify(data));
        } catch {
          // ignore storage failures
        }
        setScanningModalOpen(false);
        navigate(`/report?reportId=${encodeURIComponent(data.id)}`, { state: { from: "/", report: data } });
        return;
      }
      setScanningModalOpen(false);
      navigate("/report");
    });
  };

  const handleStopScan = () => {
    void cancelScan(scanJobIdRef.current, { accessToken: session?.access_token });
    scanAbortControllerRef.current?.abort();
    scanAbortControllerRef.current = null;
    scanJobIdRef.current = null;
    setIsScanning(false);
    setScanningModalOpen(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleStartScan();
    }
  };

  return (
    <>
      <section className="relative overflow-hidden bg-[#0e1230] py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(123,123,246,0.18),transparent_35%),linear-gradient(135deg,rgba(7,10,26,0.96),rgba(13,18,48,0.98))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:5rem_5rem] opacity-15" />

        <div className="container relative mx-auto max-w-4xl px-4 md:px-6">
          <div className="mx-auto text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
              <span className="bg-gradient-to-r from-[#585fc9] to-[#fff] bg-clip-text text-transparent">
                Ready to Make Your Website
              </span>{" "}
              <span className="text-[#fff]">AI-Ready?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
              Scan your site in minutes and receive a structured AI-readiness report.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <Input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={url}
                  onChange={handleUrlChange}
                  onKeyPress={handleKeyPress}
                  className={`w-full border-white/15 bg-white/10 px-5 py-7 text-base text-white placeholder:text-white/45 backdrop-blur-sm focus:border-accent focus:bg-white/15 ${
                    error ? "border-red-400 focus:border-red-400" : ""
                  }`}
                />
                {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
              </div>
              <Button
                onClick={handleStartScan}
                disabled={!url.trim() || !!error || isScanning}
                size="lg"
                className="disabled:cursor-not-allowed"
              >
                {isScanning ? "Scanning..." : "Start Free Scan"}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
            <p className="mt-4 text-sm text-white/65">Free forever - no credit card required - results in about 60 seconds.</p>
            {scanError && <p className="mt-3 text-sm text-red-300">{scanError}</p>}
          </div>
        </div>
      </section>

      <ScanningModal
        open={scanningModalOpen}
        onOpenChange={setScanningModalOpen}
        websiteUrl={url}
        onStopScan={handleStopScan}
      />
    </>
  );
}
