export const STALE_SCAN_IDLE_MS = 10 * 60 * 1000;
export const PENDING_SCAN_URL_KEY = "rankio.pendingScanUrl";

export function isScanStateStale(lastActiveAt: number, thresholdMs = STALE_SCAN_IDLE_MS) {
  return Date.now() - lastActiveAt >= thresholdMs;
}

export function readPendingScanUrl() {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(PENDING_SCAN_URL_KEY);
  } catch {
    return null;
  }
}

export function writePendingScanUrl(url: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_SCAN_URL_KEY, url);
  } catch {
    // ignore storage failures
  }
}

export function clearPendingScanUrl() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_SCAN_URL_KEY);
  } catch {
    // ignore storage failures
  }
}
