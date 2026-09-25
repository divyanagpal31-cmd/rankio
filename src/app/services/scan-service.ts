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

function toFriendlyScanError(message: string, code?: string) {
  const originalMessage = String(message ?? "").trim();
  const normalizedCode = String(code ?? "").trim().toUpperCase();
  switch (normalizedCode) {
    case "DOMAIN_NOT_REACHABLE":
      return "This domain is not reachable yet. Please check the DNS or hosting setup and try again after the website is live.";
    case "WEBSITE_NOT_LIVE":
      return "We reached the domain, but no active website content is available to scan. Please publish the website and try again.";
    case "WEBSITE_BLOCKED":
      return "This website is blocking access to the scan. Please allow public access or update the site security settings, then try again.";
    case "WEBSITE_TIMEOUT":
      return "The website did not respond in time. Please check that the website is online and try again.";
    case "WEBSITE_SERVER_ERROR":
      return "The website server returned an error. Please check the hosting/server status and try again after it is fixed.";
    case "WEBSITE_NOT_SCANNABLE":
      return "This URL does not look like a readable website page. Please enter the main website URL and try again.";
    case "WEBSITE_NOT_REACHABLE":
      return "We could not reach this website. Please check that the site is online and accessible in a browser, then try again.";
  }

  const normalized = originalMessage.toLowerCase();

  if (
    normalized.includes("name or service not known") ||
    normalized.includes("failed to lookup address information") ||
    normalized.includes("dns") ||
    normalized.includes("enotfound")
  ) {
    return "We could not reach that website. Please check the URL and try again.";
  }

  if (
    normalized.includes("invalid url") ||
    normalized.includes("unsupported protocol") ||
    normalized.includes("relative url")
  ) {
    return "Please enter a valid website URL and try again.";
  }

  if (
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("network error")
  ) {
    return "The scan took too long to start. Please try again in a moment.";
  }

  if (
    normalized.includes("bot protection") ||
    normalized.includes("security check") ||
    normalized.includes("captcha") ||
    normalized.includes("not a robot") ||
    normalized.includes("access denied") ||
    normalized.includes("request blocked") ||
    normalized.includes("blocked access") ||
    normalized.includes("blocking access") ||
    normalized.includes("automated access") ||
    normalized.includes("robot check")
  ) {
    return "This website is blocking access to the scan. Please allow public access or update the site security settings, then try again.";
  }

  if (originalMessage && !/^edge function returned a non-2xx status code$/i.test(originalMessage)) {
    return originalMessage;
  }

  return "We could not scan that website right now. Please try again.";
}

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
            if (code && details) {
              return {
                error: toFriendlyScanError(msg ? `${msg}: ${details}` : details, code),
                errorCode: code,
                status,
                limit,
                used,
                upgradeUrl,
              };
            }
            if (code) {
              return {
                error: toFriendlyScanError(msg || code, code),
                errorCode: code,
                status,
                limit,
                used,
                upgradeUrl,
              };
            }
          } catch {
            // not json, fall back to raw text
            return { error: toFriendlyScanError(raw), status };
          }
        }
      } catch {
        // ignore context parsing failures
      }
    }
    return { error: toFriendlyScanError(defaultMsg) };
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
