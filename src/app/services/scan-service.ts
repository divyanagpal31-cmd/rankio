import { supabase } from "../../lib/supabase";
import { getOrCreateVisitorId } from "./visitor-id";

export type ScanResult = {
  id: string;
  website_id: string;
  status: string;
  ai_score?: number;
  performance_score?: number;
  seo_score?: number;
  technical_score?: number;
  generated_at?: string;
  raw_scan_data?: unknown;
  cached?: boolean;
};

export type ScanErrorCode = "SCAN_LIMIT_REACHED";

type ScanLimitGate = {
  limit?: number;
  used?: number;
  upgradeUrl?: string;
  expiresAt: number;
};

const scanLimitGateTtlMs = 10 * 60 * 1000;

function scanLimitGateKey(visitorId: string) {
  return `rankio.scan_limit_gate.${visitorId}`;
}

export function getScanLimitGate(): Omit<ScanLimitGate, "expiresAt"> | null {
  if (typeof window === "undefined") return null;
  const visitorId = getOrCreateVisitorId();
  try {
    const raw = localStorage.getItem(scanLimitGateKey(visitorId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScanLimitGate;
    if (!parsed?.expiresAt || Date.now() > parsed.expiresAt) {
      localStorage.removeItem(scanLimitGateKey(visitorId));
      return null;
    }
    return { limit: parsed.limit, used: parsed.used, upgradeUrl: parsed.upgradeUrl };
  } catch {
    return null;
  }
}

export function clearScanLimitGate() {
  if (typeof window === "undefined") return;
  const visitorId = getOrCreateVisitorId();
  try {
    localStorage.removeItem(scanLimitGateKey(visitorId));
  } catch {
    // ignore
  }
}

function setScanLimitGate(value: { limit?: number; used?: number; upgradeUrl?: string }) {
  if (typeof window === "undefined") return;
  const visitorId = getOrCreateVisitorId();
  try {
    const payload: ScanLimitGate = { ...value, expiresAt: Date.now() + scanLimitGateTtlMs };
    localStorage.setItem(scanLimitGateKey(visitorId), JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Calls the Supabase Edge Function "scan" which wraps PageSpeed Insights.
 * It returns a cached report if a fresh one (<12h) exists, otherwise runs a new scan.
 */
export async function runScan(url: string): Promise<{
  data?: ScanResult;
  error?: string;
  errorCode?: ScanErrorCode | string;
  status?: number;
  limit?: number;
  used?: number;
  upgradeUrl?: string;
}> {
  const visitorId = getOrCreateVisitorId();
  const { data, error } = await supabase.functions.invoke("scan", {
    body: { url, visitor_id: visitorId },
  });

  if (error) {
    const defaultMsg = error.message ?? "Scan failed";
    const ctx = (error as any)?.context as Response | undefined;
    if (ctx && typeof ctx.text === "function") {
      try {
        const status = typeof (ctx as any).status === "number" ? (ctx as any).status : undefined;
        const raw = await ctx.text();
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as any;
            const code = String(parsed?.error ?? "").trim();
            const message = String(parsed?.message ?? "").trim();
            const details = String(parsed?.details ?? "").trim();

            const limit = typeof parsed?.limit === "number" ? parsed.limit : undefined;
            const used = typeof parsed?.used === "number" ? parsed.used : undefined;
            const upgradeUrl = String(parsed?.upgrade_url ?? "").trim() || undefined;

            const msg = message || (code && code !== "SCAN_LIMIT_REACHED" ? code : "");
            if (code === "SCAN_LIMIT_REACHED") {
              setScanLimitGate({ limit, used, upgradeUrl });
            }
            if (code && details) return { error: msg ? `${msg}: ${details}` : details, errorCode: code, status, limit, used, upgradeUrl };
            if (code) return { error: msg || code, errorCode: code, status, limit, used, upgradeUrl };
          } catch {
            // not json, fall back to raw text
            return { error: raw, status };
          }
        }
      } catch {
        // ignore context parsing failures
      }
    }
    return { error: defaultMsg };
  }

  clearScanLimitGate();
  return { data: data as ScanResult };
}
