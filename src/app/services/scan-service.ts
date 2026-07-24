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
  credit_used?: boolean;
};

export type ScanErrorCode = "AUTH_REQUIRED";

type RunScanOptions = {
  accessToken?: string | null;
  requireAuth?: boolean;
  signal?: AbortSignal;
  scanJobId?: string;
};

type CancelScanOptions = {
  accessToken?: string | null;
};

/**
 * Calls the Supabase Edge Function "scan" which wraps PageSpeed Insights.
 * It returns a cached report if a fresh one (<24h) exists, otherwise runs a new scan.
 */
export async function runScan(url: string, options: RunScanOptions = {}): Promise<{
  data?: ScanResult;
  error?: string;
  errorCode?: ScanErrorCode | string;
  status?: number;
  limit?: number;
  used?: number;
  upgradeUrl?: string;
}> {
  const accessToken = options.accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  if (options.requireAuth && !accessToken) {
    return {
      error: "We couldn't verify your login session. Please wait a moment and try scanning again.",
      errorCode: "AUTH_REQUIRED",
    };
  }
  const visitorId = getOrCreateVisitorId();
  const { data, error } = await supabase.functions.invoke("scan", {
    body: { url, visitor_id: visitorId, scan_job_id: options.scanJobId },
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    signal: options.signal,
  });

  if (error) {
    if ((error as any)?.name === "AbortError" || options.signal?.aborted) {
      return {
        error: "Scan stopped",
        errorCode: "SCAN_ABORTED",
      };
    }

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

            const msg = message || code;
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
  if (typeof window !== "undefined" && accessToken) {
    window.dispatchEvent(new Event("rankio:subscription-updated"));
  }
  return { data: data as ScanResult };
}

export async function cancelScan(scanJobId: string | null | undefined, options: CancelScanOptions = {}) {
  if (!scanJobId) return;
  const accessToken = options.accessToken ?? (await supabase.auth.getSession()).data.session?.access_token;
  try {
    await supabase.functions.invoke("cancel-scan", {
      body: {
        scan_job_id: scanJobId,
        visitor_id: getOrCreateVisitorId(),
      },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    });
  } catch {
    // The UI should still close immediately; the browser abort remains as fallback.
  }
}
