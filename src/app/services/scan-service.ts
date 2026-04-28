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
  const { data, error } = await supabase.functions.invoke("scan", {
    body: { url, visitor_id: getOrCreateVisitorId() },
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

  return { data: data as ScanResult };
}
