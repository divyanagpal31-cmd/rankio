export type AuditTone = "rose" | "amber" | "emerald" | "sky";
export function auditTone(result: { available?: boolean; positive?: boolean; severity?: string | null; score?: number | null }): AuditTone {
  if (result.available === false) return "sky";
  const severity = result.severity?.trim().toLowerCase();
  if (severity === "critical" || severity === "high") return "rose";
  if (severity === "medium") return "amber";
  if (severity === "low" || severity === "info") return "sky";
  if (result.positive) return "emerald";
  if (result.score != null && Number.isFinite(result.score)) {
    return result.score >= 80 ? "emerald" : result.score >= 50 ? "amber" : "rose";
  }
  return "sky";
}
export function highestAuditSeverity(severities: Array<string | null | undefined>): string | undefined {
  const rank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  return severities.filter((value): value is string => typeof value === "string").sort((a, b) => (rank[b.toLowerCase()] ?? -1) - (rank[a.toLowerCase()] ?? -1))[0];
}