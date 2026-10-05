export const DETAILS_SCORING_VERSION = "structured-details-v1";
const list = (value: unknown): any[] => Array.isArray(value) ? value : [];
const count = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

// Read the same JSON-LD roots and @graph nodes as the validator, including multi-type nodes.
export function collectSchemaTypes(value: unknown): string[] {
  const types = new Set<string>();
  const visit = (node: any) => {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    for (const type of Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]]) {
      if (typeof type === "string" && type.trim()) types.add(type.trim());
    }
    if (Array.isArray(node["@graph"])) node["@graph"].forEach(visit);
  };
  visit(value);
  return [...types];
}

// Validator evidence repairs type lists in historical crawls affected by the @graph extractor bug.
export function pageSchemaTypes(page: any): string[] {
  return [...new Set([...list(page?.schemaTypes), ...list(page?.schemaValidation?.items).map(item => item?.type)].filter(type => typeof type === "string" && type.trim() && type !== "Thing"))];
}
export function isRecognizedDetailType(type: string): boolean {
  return /Organization|Brand|Corporation|LocalBusiness|WebSite|WebPage|Review|Rating|FAQ|Product|Offer|Article|BlogPosting|Breadcrumb/i.test(type);
}
function validationQuality(summary: any): number {
  const items = count(summary?.itemCount);
  const syntaxErrors = count(summary?.syntaxErrorCount);
  if (!items || summary?.validItemCount == null) return 0;
  let quality = Math.min(1, count(summary.validItemCount) / (items + syntaxErrors));
  if (count(summary.errorCount) > 0) quality = Math.min(quality, 0.7);
  if (count(summary.warningCount) > 0) quality = Math.min(quality, 0.9);
  return quality;
}
export function calculateDetailsScore(pages: any[], validation?: any) {
  if (!pages.length) return null;
  const hasMarkup = (page: any) => pageSchemaTypes(page).length > 0 || count(page?.schemaValidation?.itemCount) > 0;
  const pagesWithSchema = pages.filter(hasMarkup).length;
  const coverage = pagesWithSchema / pages.length;
  const typeCoverage = pages.filter(page => pageSchemaTypes(page).some(isRecognizedDetailType)).length / pages.length;
  const quality = pages.reduce((sum, page) => sum + (hasMarkup(page) ? validationQuality(page.schemaValidation ?? validation) : 0), 0) / pages.length;
  const weighted = Math.round(coverage * 50 + quality * 30 + typeCoverage * 20);
  const score = coverage === 1 && quality === 1 && typeCoverage === 1 ? 100 : Math.min(99, weighted);
  const summaries = pages.map(page => page.schemaValidation).filter(Boolean);
  const total = (key: string) => summaries.length ? summaries.reduce((sum, summary) => sum + count(summary[key]), 0) : count(validation?.[key]);
  const itemCount = total("itemCount");
  const errorCount = total("errorCount");
  const warningCount = total("warningCount");
  const validationAvailable = summaries.length > 0 || validation?.itemCount != null;
  return { score, coverage, quality, typeCoverage, pagesWithSchema, types: [...new Set(pages.flatMap(pageSchemaTypes))], itemCount, errorCount, warningCount, validationAvailable, version: DETAILS_SCORING_VERSION };
}

export function businessDetailsMatch(summary: any) {
  const fields = ["businessName", "address", "phone"];
  const inconsistent = [...new Set([...list(summary?.inconsistentFields), ...fields.filter(field => list(summary?.fields?.[field]?.values).length > 1)])];
  if (inconsistent.length) return { value: "Needs review", detail: `Different ${inconsistent.join(", ")} values were found across reviewed pages.`, tone: "amber" as const };
  const detectedFields = fields.filter(field => count(summary?.fields?.[field]?.pageCount) > 0);
  const comparable = fields.filter(field => count(summary?.fields?.[field]?.pageCount) >= 2 && list(summary?.fields?.[field]?.values).length === 1 && summary?.fields?.[field]?.consistent === true);
  if (comparable.length === 3) return { value: "Consistent", detail: "Business name, address, and phone each match on at least two reviewed pages.", tone: "emerald" as const };
  if (comparable.length) return { value: "Partial match", detail: `Matching fields: ${comparable.join(", ")}. Other business fields lack enough comparable page evidence.`, tone: "amber" as const };
  if (summary?.detected || detectedFields.length) return { value: "Not enough data", detail: "Business details were detected, but there is not enough evidence to compare them across at least two pages.", tone: "slate" as const };
  return { value: "Not detected", detail: "No comparable business name, address, or phone details were found in the reviewed pages.", tone: "slate" as const };
}