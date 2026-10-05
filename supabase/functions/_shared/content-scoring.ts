export const CONTENT_SCORING_VERSION = "content-coverage-v2";
export const hasContentText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const bounded = (value: unknown, max = 100) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(max, number)) : 0;
};

// Fixed weights and per-page averages prevent crawl size and extra headings from inflating scores.
export function calculateContentScore(pages: Array<Record<string, any>>) {
  if (!pages.length) return null;
  const average = (measure: (page: Record<string, any>) => number) => pages.reduce((sum, page) => sum + measure(page), 0) / pages.length;
  const titleCoverage = average(page => hasContentText(page.title) ? 1 : 0);
  const metaCoverage = average(page => hasContentText(page.metaDescription) ? 1 : 0);
  const headingCoverage = average(page => Number(page.h1Count) === 1 ? 1 : 0);
  const supportingHeadings = average(page => Number(page.h1Count) === 1 ? bounded(page.h2Count, 2) / 2 : 0);
  const depthCoverage = average(page => bounded(page.wordCount, 800) / 800);
  const pageQuality = average(page => bounded(page.pageScore));
  const weightedScore = Math.round(titleCoverage * 20 + metaCoverage * 20 + headingCoverage * 20 + supportingHeadings * 5 + depthCoverage * 20 + pageQuality * 0.15);
  const perfect = titleCoverage === 1 && metaCoverage === 1 && headingCoverage === 1 && supportingHeadings === 1 && depthCoverage === 1 && pageQuality === 100;
  const score = perfect ? 100 : Math.min(99, weightedScore);
  return { score, titleCoverage, metaCoverage, headingCoverage, depthCoverage, pageQuality, version: CONTENT_SCORING_VERSION };
}

export function calculateVerticalLift(vertical: string, pages: Array<Record<string, any>>): number {
  if (vertical === "ecommerce") return Math.min(10, pages.filter(page => (page.schemaTypes ?? []).some((type: string) => /Product|Offer|Review/i.test(type))).length * 2);
  if (vertical === "saas") return Math.min(10, pages.filter(page => /pricing|docs|feature|api/i.test(`${page.title ?? ""} ${page.url}`)).length * 2);
  if (vertical === "local") return Math.min(10, pages.filter(page => /location|contact|service/i.test(`${page.title ?? ""} ${page.url}`)).length * 2);
  if (vertical === "content") return Math.min(10, pages.filter(page => page.faqCount > 0).length * 2);
  return 0;
}
// Update saved reports from their crawl evidence without changing stored records.
export function correctReportContentScore<T extends Record<string, any>>(report: T): T {
  if (!report) return report;
  const raw = report.raw_scan_data ?? { crawler: { pages: report.scoring_pages }, analysis: { scoreBreakdown: report.scoring_breakdown } };
  const pages = raw?.crawler?.pages;
  if (!Array.isArray(pages) || !pages.length) return report;
  const content = calculateContentScore(pages)!;
  const previous = raw?.preview_payload?.score_breakdown ?? report.preview_payload?.score_breakdown ?? report.score_breakdown ?? raw?.analysis?.scoreBreakdown ?? {};
  const read = (snake: string, camel: string) => previous[snake] ?? previous[camel];
  const technical = read("technical_visibility", "technicalVisibility");
  const oldContent = read("content_visibility", "contentVisibility");
  const ai = read("ai_understanding", "aiUnderstanding");
  const citation = read("citation_visibility", "citationVisibility");
  const oldOverall = read("overall_score", "overallScore") ?? report.ai_score;
  const complete = [technical, oldContent, ai, citation, oldOverall].every(value => typeof value === "number" && Number.isFinite(value));
  const oldBase = complete ? Math.round((technical + oldContent + ai + citation) / 4) : 0;
  const vertical = raw?.rankio?.vertical ?? previous.vertical ?? report.preview_payload?.vertical;
  const industryLift = vertical ? calculateVerticalLift(vertical, pages) : complete ? Math.max(0, oldOverall - oldBase) : 0;
  const overall = complete ? Math.min(100, Math.round((technical + content.score + ai + citation) / 4) + industryLift) : report.ai_score;
  const breakdown = { ...previous, content_visibility: content.score, contentVisibility: content.score, contentScoringVersion: content.version, contentScoreDetails: content, ...(complete ? { overall_score: overall, overallScore: overall } : {}) };
  const summary = (value: unknown) => typeof value === "string" && complete ? value.replace(/AI visibility score \d+\/100/gi, `AI visibility score ${overall}/100`) : value;
  const preview = (value: any) => value ? { ...value, score_breakdown: breakdown, summary: summary(value.summary) } : value;
  return { ...report, ...(complete ? { ai_score: overall } : {}), ai_summary: summary(report.ai_summary), score_breakdown: breakdown, preview_payload: preview(report.preview_payload), raw_scan_data: { ...raw, preview_payload: preview(raw.preview_payload), analysis: { ...raw.analysis, scoreBreakdown: breakdown } } };
}