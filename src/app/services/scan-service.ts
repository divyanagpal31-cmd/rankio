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
};

/**
 * Calls the Supabase Edge Function "scan" which wraps PageSpeed Insights.
 * It returns a cached report if a fresh one (<12h) exists, otherwise runs a new scan.
 */
export async function runScan(url: string): Promise<{ data?: ScanResult; error?: string }> {
  const { data, error } = await supabase.functions.invoke("scan", {
    body: { url, visitor_id: getOrCreateVisitorId() },
  });

  if (error) {
    const defaultMsg = error.message ?? "Scan failed";
    const ctx = (error as any)?.context as Response | undefined;
    if (ctx && typeof ctx.text === "function") {
      try {
        const raw = await ctx.text();
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as any;
            const msg = String(parsed?.error ?? "").trim();
            const details = String(parsed?.details ?? "").trim();
            if (msg && details) return { error: `${msg}: ${details}` };
            if (msg) return { error: msg };
          } catch {
            // not json, fall back to raw text
            return { error: raw };
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
