export type ReportComparisonInput = {
  id: string;
  website_id?: string | null;
  status?: string | null;
  ai_score?: number | null;
  performance_score?: number | null;
  seo_score?: number | null;
  technical_score?: number | null;
  raw_scan_data?: unknown;
  recommendations?: unknown;
  generated_at?: string | null;
  report_level?: string | null;
  is_cached?: boolean | null;
};

export type ComparedMetric = {
  label: string;
  key: "ai_score" | "seo_score" | "technical_score" | "performance_score";
  values: Array<number | null>;
  firstValue: number | null;
  lastValue: number | null;
  delta: number | null;
};

export type ComparedFinding = {
  key: string;
  title: string;
  severity: string;
  category: string;
  description: string;
  recommendation: string;
  pageUrl: string | null;
};

export type ReportComparison = {
  reports: ReportComparisonInput[];
  metrics: ComparedMetric[];
  fixedFindings: ComparedFinding[];
  newFindings: ComparedFinding[];
  persistentFindings: ComparedFinding[];
  addedRecommendations: string[];
  removedRecommendations: string[];
  changedMetricsCount: number;
  improvedMetricsCount: number;
  declinedMetricsCount: number;
  resultLabel: string;
  insightBullets: string[];
};

const metricDefinitions: Array<Pick<ComparedMetric, "label" | "key">> = [
  { label: "AI Score", key: "ai_score" },
  { label: "SEO Score", key: "seo_score" },
  { label: "Technical", key: "technical_score" },
  { label: "Performance", key: "performance_score" },
];

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/https?:\/\//g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getRawObject(report: ReportComparisonInput): Record<string, any> {
  return report.raw_scan_data && typeof report.raw_scan_data === "object" ? (report.raw_scan_data as Record<string, any>) : {};
}

function normalizeFinding(rawFinding: any): ComparedFinding | null {
  const title = String(rawFinding?.title ?? rawFinding?.signalKey ?? "").trim();
  if (!title) return null;

  const signalKey = normalizeText(rawFinding?.signalKey);
  const category = String(rawFinding?.category ?? "general").trim() || "general";
  const pageUrl = rawFinding?.pageUrl ? String(rawFinding.pageUrl) : null;
  const keyParts = [signalKey || normalizeText(title), normalizeText(category), normalizeText(pageUrl)].filter(Boolean);

  return {
    key: keyParts.join(":"),
    title,
    severity: String(rawFinding?.severity ?? "info").trim() || "info",
    category,
    description: String(rawFinding?.description ?? "").trim(),
    recommendation: String(rawFinding?.recommendation ?? "").trim(),
    pageUrl,
  };
}

function extractFindings(report: ReportComparisonInput): ComparedFinding[] {
  const rawScanData = getRawObject(report);
  const analysisFindings = safeArray<any>(rawScanData?.analysis?.findings);
  return analysisFindings.map(normalizeFinding).filter(Boolean) as ComparedFinding[];
}

function extractRecommendationTitles(report: ReportComparisonInput): string[] {
  const rawScanData = getRawObject(report);
  const recommendations = [
    ...safeArray<any>(report.recommendations),
    ...safeArray<any>(rawScanData?.analysis?.recommendations),
  ];

  const titles = recommendations
    .map((recommendation) => String(recommendation?.title ?? recommendation?.parameter ?? recommendation?.recommendation ?? "").trim())
    .filter(Boolean);

  return Array.from(new Set(titles));
}

function compareItemsByKey<T extends { key: string }>(firstItems: T[], lastItems: T[]) {
  const firstMap = new Map(firstItems.map((item) => [item.key, item]));
  const lastMap = new Map(lastItems.map((item) => [item.key, item]));

  return {
    removed: firstItems.filter((item) => !lastMap.has(item.key)),
    added: lastItems.filter((item) => !firstMap.has(item.key)),
    persistent: lastItems.filter((item) => firstMap.has(item.key)),
  };
}

function compareRecommendationTitles(firstTitles: string[], lastTitles: string[]) {
  const firstItems = firstTitles.map((title) => ({ key: normalizeText(title), title }));
  const lastItems = lastTitles.map((title) => ({ key: normalizeText(title), title }));
  const compared = compareItemsByKey(firstItems, lastItems);

  return {
    removed: compared.removed.map((item) => item.title),
    added: compared.added.map((item) => item.title),
  };
}

function buildMetrics(reports: ReportComparisonInput[]): ComparedMetric[] {
  return metricDefinitions.map((metric) => {
    const values = reports.map((report) => toNumber(report[metric.key]));
    const firstValue = values[0] ?? null;
    const lastValue = values[values.length - 1] ?? null;
    const delta = firstValue !== null && lastValue !== null ? lastValue - firstValue : null;
    return { ...metric, values, firstValue, lastValue, delta };
  });
}

function buildResultLabel(improvedMetricsCount: number, declinedMetricsCount: number, fixedCount: number, newCount: number) {
  if (improvedMetricsCount === 0 && declinedMetricsCount === 0 && fixedCount === 0 && newCount === 0) {
    return "No major changes detected";
  }

  const parts: string[] = [];
  if (improvedMetricsCount > 0) parts.push(`${improvedMetricsCount} score metric${improvedMetricsCount === 1 ? "" : "s"} improved`);
  if (declinedMetricsCount > 0) parts.push(`${declinedMetricsCount} score metric${declinedMetricsCount === 1 ? "" : "s"} declined`);
  if (fixedCount > 0) parts.push(`${fixedCount} finding${fixedCount === 1 ? "" : "s"} fixed`);
  if (newCount > 0) parts.push(`${newCount} new finding${newCount === 1 ? "" : "s"}`);
  return parts.join(", ");
}

function buildInsightBullets(comparison: Omit<ReportComparison, "insightBullets">): string[] {
  const bullets: string[] = [];
  const aiMetric = comparison.metrics.find((metric) => metric.key === "ai_score");

  if (aiMetric?.delta !== null && aiMetric?.delta !== undefined) {
    if (aiMetric.delta > 0) bullets.push(`AI Score improved by ${aiMetric.delta} point${aiMetric.delta === 1 ? "" : "s"}.`);
    if (aiMetric.delta < 0) bullets.push(`AI Score declined by ${Math.abs(aiMetric.delta)} point${Math.abs(aiMetric.delta) === 1 ? "" : "s"}.`);
  }

  if (comparison.fixedFindings.length > 0) {
    bullets.push(`${comparison.fixedFindings.length} finding${comparison.fixedFindings.length === 1 ? " was" : "s were"} fixed since the earlier report.`);
  }

  if (comparison.newFindings.length > 0) {
    bullets.push(`${comparison.newFindings.length} new finding${comparison.newFindings.length === 1 ? " needs" : "s need"} attention.`);
  }

  if (comparison.persistentFindings.length > 0) {
    bullets.push(`${comparison.persistentFindings.length} finding${comparison.persistentFindings.length === 1 ? " is" : "s are"} still open across both reports.`);
  }

  if (bullets.length === 0) {
    bullets.push("The selected reports look stable across tracked scores and findings.");
  }

  return bullets.slice(0, 4);
}

export function buildReportComparison(selectedReports: ReportComparisonInput[]): ReportComparison | null {
  if (selectedReports.length < 2) return null;

  const reports = [...selectedReports].sort((left, right) => {
    const leftTime = left.generated_at ? new Date(left.generated_at).getTime() : 0;
    const rightTime = right.generated_at ? new Date(right.generated_at).getTime() : 0;
    return leftTime - rightTime;
  });

  const firstReport = reports[0];
  const lastReport = reports[reports.length - 1];
  const metrics = buildMetrics(reports);
  const changedMetrics = metrics.filter((metric) => metric.delta !== null && metric.delta !== 0);
  const improvedMetricsCount = changedMetrics.filter((metric) => (metric.delta ?? 0) > 0).length;
  const declinedMetricsCount = changedMetrics.filter((metric) => (metric.delta ?? 0) < 0).length;
  const comparedFindings = compareItemsByKey(extractFindings(firstReport), extractFindings(lastReport));
  const comparedRecommendations = compareRecommendationTitles(
    extractRecommendationTitles(firstReport),
    extractRecommendationTitles(lastReport)
  );

  const comparisonWithoutInsights = {
    reports,
    metrics,
    fixedFindings: comparedFindings.removed,
    newFindings: comparedFindings.added,
    persistentFindings: comparedFindings.persistent,
    addedRecommendations: comparedRecommendations.added,
    removedRecommendations: comparedRecommendations.removed,
    changedMetricsCount: changedMetrics.length,
    improvedMetricsCount,
    declinedMetricsCount,
    resultLabel: buildResultLabel(
      improvedMetricsCount,
      declinedMetricsCount,
      comparedFindings.removed.length,
      comparedFindings.added.length
    ),
  };

  return {
    ...comparisonWithoutInsights,
    insightBullets: buildInsightBullets(comparisonWithoutInsights),
  };
}
