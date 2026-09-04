import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const scanVersion = "2026-06-09-architecture-v1";
const crawlerVersion = "2026-06-09-crawler-v1";
const psiVersion = "pagespeedonline/v5";
const crawlLimit = 5;
const requestTimeoutMs = 12000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-rankio-scan-version",
  "x-rankio-scan-version": scanVersion,
};

type ReportRow = {
  id: string;
  website_id: string;
  status: string;
  ai_score?: number;
  performance_score?: number;
  seo_score?: number;
  technical_score?: number;
  raw_scan_data?: unknown;
  ai_summary?: string;
  recommendations?: unknown;
  generated_at?: string;
};

type Recommendation = {
  title: string;
  severity: "High" | "Medium" | "Good" | "Info";
  description: string;
  recommendation: string;
  category?: string;
};

type Vertical = "ecommerce" | "saas" | "local" | "content" | "other";

type SubscriptionRow = {
  status?: string | null;
  current_period_end?: string | null;
  plan?: string | null;
  plan_slug?: string | null;
  report_quota?: number | null;
  reports_used?: number | null;
  lifetime_access?: boolean | null;
};

type PageSnapshot = {
  url: string;
  canonicalUrl: string | null;
  statusCode: number | null;
  title: string | null;
  metaDescription: string | null;
  wordCount: number;
  h1Count: number;
  h2Count: number;
  internalLinksOut: number;
  internalLinksIn: number;
  schemaTypes: string[];
  pageScore: number;
  rawMeta: Record<string, unknown>;
  headings: string[];
  faqCount: number;
  imageAltCount: number;
  imageCount: number;
  noindex: boolean;
  canonicalMismatch: boolean;
  text: string;
  hreflangLinks: Array<{ hreflang: string; url: string }>;
  chunks: Array<{
    index: number;
    text: string;
    hash: string;
    entityTags: string[];
    answerabilityScore: number;
    retrievalRelevanceScore: number;
  }>;
  links: string[];
};

type DiscoveryResult = {
  robotsTxt: string | null;
  sitemapUrls: string[];
  sitemapDiscoveredUrls: string[];
  pageSnapshots: PageSnapshot[];
  brokenLinks: Array<{ url: string; statusCode: number | null; sourceUrl: string | null }>;
  entityEnrichment: {
    brandName: string | null;
    publisherName: string | null;
    sameAsUrls: string[];
    externalProfiles: Array<{
      url: string;
      title: string | null;
      description: string | null;
      statusCode: number | null;
    }>;
    confidence: number;
  };
  discoveryNotes: string[];
  rendering: {
    enabled: boolean;
    pagesRendered: number;
  };
};

type RenderedPageResult = {
  html: string;
  status: number | null;
  contentType: string | null;
  finalUrl: string | null;
};

type AnalysisFinding = {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  signalKey: string;
  title: string;
  description: string;
  recommendation: string;
  evidence: Record<string, unknown>;
  pageUrl?: string | null;
};

function normalizeUrl(raw: string): string {
  let value = raw.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  const url = new URL(value);
  url.hash = "";
  if (url.pathname === "/") url.pathname = "";
  return url.toString().replace(/\/$/, "");
}

function stripMarkdownLinks(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function toSeverityFromScore(score: unknown): Recommendation["severity"] {
  if (typeof score !== "number") return "Info";
  if (score < 0.5) return "High";
  if (score < 0.9) return "Medium";
  return "Good";
}

function formatSavingsMs(ms?: unknown): string {
  const value = typeof ms === "number" ? ms : 0;
  if (!Number.isFinite(value) || value <= 0) return "";
  return `${Math.round(value)}ms`;
}

function formatSavingsBytes(bytes?: unknown): string {
  const value = typeof bytes === "number" ? bytes : 0;
  if (!Number.isFinite(value) || value <= 0) return "";
  const kilobytes = value / 1024;
  if (kilobytes < 1024) return `${Math.round(kilobytes)} KB`;
  return `${(kilobytes / 1024).toFixed(1)} MB`;
}

function hashText(value: string): string {
  const data = new TextEncoder().encode(value);
  return crypto.subtle.digest("SHA-256", data).then((buffer) => {
    const bytes = new Uint8Array(buffer);
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  });
}

function textSnippet(text: string, length = 180): string {
  return text.replace(/\s+/g, " ").trim().slice(0, length);
}

function splitIntoChunks(text: string, maxChunks = 3, chunkSize = 550): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/g).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length <= chunkSize) {
      current = `${current} ${sentence}`.trim();
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
    if (chunks.length >= maxChunks) break;
  }

  if (chunks.length < maxChunks && current) chunks.push(current);
  return chunks.filter((chunk) => chunk.length >= 40).slice(0, maxChunks);
}

function detectVertical(normalizedUrl: string): Vertical {
  const value = normalizedUrl.toLowerCase();
  const path = (() => {
    try {
      return new URL(normalizedUrl).pathname.toLowerCase();
    } catch {
      return value;
    }
  })();

  const combined = `${value} ${path}`;
  if (/(shop|store|cart|checkout|product|products|category|collection|commerce|e-?commerce|sku|merchant)/.test(combined)) {
    return "ecommerce";
  }
  if (/(local|location|locations|service-area|services|near me|near-me|map|branch|office|contact us|hours|reviews?)/.test(combined)) {
    return "local";
  }
  if (/(saas|software|app|platform|dashboard|pricing|demo|features|docs|api|sign up|signup|login|trial)/.test(combined)) {
    return "saas";
  }
  if (/(blog|news|article|articles|magazine|editorial|content|stories|learn|resources|library|guides?)/.test(combined)) {
    return "content";
  }
  return "other";
}

function getWeights(vertical: Vertical) {
  switch (vertical) {
    case "ecommerce":
      return { perf: 0.25, seo: 0.35, best: 0.2, a11y: 0.2 };
    case "saas":
      return { perf: 0.25, seo: 0.2, best: 0.2, a11y: 0.35 };
    case "local":
      return { perf: 0.3, seo: 0.35, best: 0.15, a11y: 0.2 };
    case "content":
      return { perf: 0.2, seo: 0.3, best: 0.15, a11y: 0.35 };
    default:
      return { perf: 0.4, seo: 0.3, best: 0.2, a11y: 0.1 };
  }
}

function getAccessTier(planSlug?: string | null, plan?: string | null): string {
  const value = String(planSlug ?? plan ?? "").toLowerCase();
  if (["starter", "growth", "pro"].includes(value)) return value;
  return "free";
}

function buildRecommendations(psiJson: any): Recommendation[] {
  const audits = psiJson?.lighthouseResult?.audits ?? {};
  const categories = psiJson?.lighthouseResult?.categories ?? {};
  const out: Recommendation[] = [];

  const addAudit = (auditId: string, category: string) => {
    const audit = audits?.[auditId];
    if (!audit) return;
    const title = String(audit.title ?? "").trim();
    const descriptionRaw = String(audit.description ?? "").trim();
    if (!title) return;

    const severity = toSeverityFromScore(audit.score);
    const overallSavingsMs = audit?.details?.overallSavingsMs;
    const overallSavingsBytes = audit?.details?.overallSavingsBytes;
    const savingsMs = formatSavingsMs(overallSavingsMs);
    const savingsBytes = formatSavingsBytes(overallSavingsBytes);

    const savingsParts = [savingsMs && `time ${savingsMs}`, savingsBytes && `size ${savingsBytes}`].filter(Boolean);
    const savingsSuffix = savingsParts.length ? `Potential savings: ${savingsParts.join(", ")}.` : "";
    const description = stripMarkdownLinks(descriptionRaw);
    const recommendation = savingsSuffix ? `${savingsSuffix} ${title}.` : title;

    out.push({
      title,
      severity,
      description,
      recommendation,
      category,
    });
  };

  const perfAuditRefs: any[] = categories?.performance?.auditRefs ?? [];
  const perfOpportunities = perfAuditRefs
    .map((r) => String(r.id ?? ""))
    .filter(Boolean)
    .map((id) => ({ id, audit: audits?.[id] }))
    .filter((item) => item.audit?.details?.type === "opportunity")
    .sort((a, b) => (b.audit?.details?.overallSavingsMs ?? 0) - (a.audit?.details?.overallSavingsMs ?? 0))
    .slice(0, 5);

  for (const item of perfOpportunities) addAudit(item.id, "Performance");

  const pushFailing = (categoryKey: "seo" | "best-practices", label: string, limit: number) => {
    const refs: any[] = categories?.[categoryKey]?.auditRefs ?? [];
    const ids = refs
      .map((r) => String(r.id ?? ""))
      .filter(Boolean)
      .filter((id) => {
        const audit = audits?.[id];
        return typeof audit?.score === "number" && audit.score < 0.9 && audit.scoreDisplayMode === "numeric";
      })
      .slice(0, limit);
    for (const id of ids) addAudit(id, label);
  };

  pushFailing("seo", "SEO", 4);
  pushFailing("best-practices", "Best Practices", 4);
  return out;
}

function hasAllCategoryScores(rawScanData: any): boolean {
  const categories = rawScanData?.lighthouseResult?.categories;
  const keys = ["performance", "seo", "best-practices", "accessibility"];
  return keys.every((key) => typeof categories?.[key]?.score === "number");
}


function isCurrentSourceVersion(sourceVersions: unknown): boolean {
  if (!sourceVersions || typeof sourceVersions !== "object") return false;
  const versions = sourceVersions as Record<string, unknown>;
  return versions.scan === scanVersion && versions.crawler === crawlerVersion && versions.psi === psiVersion;
}
function readMetaTag(html: string, name: string, attr = "name"): string | null {
  const pattern = new RegExp(
    `<meta[^>]+${attr}=["']${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function readCanonical(html: string, baseUrl: string): string | null {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
  if (!match?.[1]) return null;
  try {
    return normalizeAbsoluteUrl(baseUrl, match[1]);
  } catch {
    return null;
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  return match[1].replace(/\s+/g, " ").trim() || null;
}

function stripTags(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadings(html: string, tag: "h1" | "h2" | "h3"): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const text = stripTags(match[1]);
    if (text) headings.push(text);
  }
  return headings;
}

function extractLinks(html: string, baseUrl: string, limit = 20): string[] {
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const links: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) && links.length < limit) {
    const href = String(match[1] ?? "").trim();
    if (!href || href.startsWith("#") || /^mailto:|^tel:|^javascript:/i.test(href)) continue;
    try {
      const resolved = normalizeAbsoluteUrl(baseUrl, href);
      links.push(resolved);
    } catch {
      // ignore invalid links
    }
  }
  return Array.from(new Set(links));
}

function extractHreflangLinks(html: string, baseUrl: string): Array<{ hreflang: string; url: string }> {
  const regex = /<link[^>]+rel=["'][^"']*alternate[^"']*["'][^>]*>/gi;
  const links: Array<{ hreflang: string; url: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const tag = match[0];
    const hreflangMatch = tag.match(/hreflang=["']([^"']+)["']/i);
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    const hreflang = hreflangMatch?.[1]?.trim();
    const href = hrefMatch?.[1]?.trim();
    if (!hreflang || !href) continue;
    try {
      links.push({ hreflang, url: normalizeAbsoluteUrl(baseUrl, href) });
    } catch {
      // ignore invalid hreflang hrefs
    }
  }
  return Array.from(new Map(links.map((link) => [`${link.hreflang}::${link.url}`, link])).values());
}

function extractSchemaTypes(html: string): string[] {
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const types = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const type = item?.["@type"];
        if (Array.isArray(type)) {
          for (const subType of type) types.add(String(subType));
        } else if (type) {
          types.add(String(type));
        }
      }
    } catch {
      // ignore invalid json-ld
    }
  }
  return Array.from(types);
}

function extractJsonLdEntities(html: string): Array<Record<string, unknown>> {
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const entities: Array<Record<string, unknown>> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object") entities.push(item as Record<string, unknown>);
      }
    } catch {
      // ignore invalid json-ld
    }
  }
  return entities;
}

function extractExternalEntitySources(html: string, baseUrl: string) {
  const entities = extractJsonLdEntities(html);
  const sameAsUrls = new Set<string>();
  const brandNames = new Set<string>();
  const publisherNames = new Set<string>();

  const visit = (value: unknown) => {
    if (!value) return;
    if (typeof value === "string") {
      if (/^https?:\/\//i.test(value)) {
        try {
          const parsed = new URL(value);
          if (parsed.origin !== new URL(baseUrl).origin) sameAsUrls.add(parsed.toString().replace(/\/$/, ""));
        } catch {
          // ignore invalid URL strings
        }
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    const type = record["@type"];
    const name = record.name;
    const publisher = record.publisher;
    const sameAs = record.sameAs;
    const url = record.url;
    const id = record["@id"];

    if (typeof name === "string" && name.trim()) {
      if (/Organization|LocalBusiness|Corporation|Brand|WebSite|Person/i.test(String(type ?? ""))) {
        brandNames.add(name.trim());
      }
    }

    if (typeof publisher === "string" && publisher.trim()) {
      publisherNames.add(publisher.trim());
    } else if (publisher && typeof publisher === "object") {
      const publisherRecord = publisher as Record<string, unknown>;
      if (typeof publisherRecord.name === "string" && publisherRecord.name.trim()) {
        publisherNames.add(publisherRecord.name.trim());
      }
      visit(publisherRecord.sameAs);
      visit(publisherRecord.url);
    }

    visit(sameAs);
    visit(url);
    visit(id);
  };

  for (const entity of entities) visit(entity);

  return {
    rendering: {
      enabled: renderedPages > 0,
      pagesRendered: renderedPages,
    },
    brandName: Array.from(brandNames)[0] ?? null,
    publisherName: Array.from(publisherNames)[0] ?? null,
    sameAsUrls: Array.from(sameAsUrls),
  };
}

function extractImages(html: string) {
  const regex = /<img[^>]*>/gi;
  let match: RegExpExecArray | null;
  let imageCount = 0;
  let imageAltCount = 0;
  while ((match = regex.exec(html))) {
    imageCount += 1;
    if (/alt=["'][^"']+["']/i.test(match[0])) imageAltCount += 1;
  }
  return { imageCount, imageAltCount };
}

function extractWordCount(html: string): { text: string; wordCount: number } {
  const text = stripTags(html);
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  return { text, wordCount };
}

function countFaqSignals(html: string): number {
  const faqMatches = html.match(/faq|frequently asked questions|questions and answers/gi);
  return faqMatches ? faqMatches.length : 0;
}

function normalizeAbsoluteUrl(baseUrl: string, href: string): string {
  const absolute = new URL(href, baseUrl);
  absolute.hash = "";
  if (absolute.pathname === "/") absolute.pathname = "";
  return absolute.toString().replace(/\/$/, "");
}

function getInternalLinksIn(pages: PageSnapshot[], targetUrl: string): number {
  return pages.reduce((count, page) => count + (page.links.includes(targetUrl) ? 1 : 0), 0);
}

function isLikelyInternalLink(url: string, origin: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.origin === origin;
  } catch {
    return false;
  }
}

function deriveEntityTags(page: PageSnapshot): string[] {
  const tags = new Set<string>();
  for (const heading of page.headings) {
    const cleaned = heading.replace(/[^a-zA-Z0-9\s-]/g, "").trim();
    if (!cleaned) continue;
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) tags.add(parts.slice(0, 3).join(" "));
  }
  const title = page.title?.trim();
  if (title) tags.add(title.slice(0, 80));
  const schema = page.schemaTypes;
  for (const type of schema) tags.add(type);
  return Array.from(tags).slice(0, 8);
}

function scorePage(page: PageSnapshot): number {
  let score = 50;
  if (page.title) score += 10;
  if (page.metaDescription) score += 10;
  if (page.canonicalUrl) score += 5;
  if (page.h1Count === 1) score += 10;
  if (page.h2Count >= 2) score += 5;
  if (page.schemaTypes.length > 0) score += Math.min(15, page.schemaTypes.length * 4);
  if (page.faqCount > 0) score += 5;
  if (page.wordCount >= 300) score += 5;
  if (page.wordCount >= 800) score += 5;
  if (page.noindex) score -= 20;
  if (!page.metaDescription) score -= 5;
  if (!page.title) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function contentChunkScores(page: PageSnapshot, chunkText: string) {
  const lower = chunkText.toLowerCase();
  const entityTags = new Set<string>(deriveEntityTags(page).slice(0, 6));
  const answerabilityScore = Math.max(
    0,
    Math.min(
      1,
      0.35 +
        (page.schemaTypes.length > 0 ? 0.2 : 0) +
        (page.faqCount > 0 ? 0.15 : 0) +
        (chunkText.length > 300 ? 0.1 : 0) +
        (/(what|why|how|when|where|who|which)/i.test(lower) ? 0.1 : 0) +
        (page.h2Count > 2 ? 0.1 : 0),
    ),
  );
  const retrievalRelevanceScore = Math.max(
    0,
    Math.min(
      1,
      0.4 +
        (page.title ? 0.2 : 0) +
        (entityTags.size > 0 ? 0.15 : 0) +
        (page.wordCount > 200 ? 0.1 : 0) +
        (page.canonicalUrl ? 0.05 : 0.0) +
        (lower.includes("faq") ? 0.05 : 0),
    ),
  );
  return { entityTags: Array.from(entityTags), answerabilityScore, retrievalRelevanceScore };
}

async function fetchText(url: string, timeoutMs = requestTimeoutMs): Promise<{ ok: boolean; status: number; text: string; contentType: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const contentType = response.headers.get("content-type");
    const text = await response.text();
    return { ok: response.ok, status: response.status, text, contentType };
  } finally {
    clearTimeout(timeout);
  }
}


function getBrowserRenderEndpoint(): string | null {
  const endpoint = Deno.env.get("BROWSER_RENDER_URL")?.trim();
  return endpoint ? endpoint : null;
}

async function fetchRenderedPage(url: string, timeoutMs = 15000): Promise<RenderedPageResult | null> {
  const endpoint = getBrowserRenderEndpoint();
  if (!endpoint) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(endpoint.includes("?") ? `${endpoint}&url=${encodeURIComponent(url)}` : `${endpoint}?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.toLowerCase().includes("html")) {
      return null;
    }
    return {
      html: await response.text(),
      status: response.status,
      contentType,
      finalUrl: response.url ? response.url.replace(/\/$/, "") : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchStatus(url: string, timeoutMs = 6000): Promise<{ status: number | null; ok: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (response.status !== 405) {
      return { status: response.status, ok: response.ok };
    }
  } catch {
    // fall through to GET probe
  } finally {
    clearTimeout(timeout);
  }

  const retryController = new AbortController();
  const retryTimeout = setTimeout(() => retryController.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: retryController.signal,
      headers: {
        "User-Agent": "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return { status: response.status, ok: response.ok };
  } catch {
    return { status: null, ok: false };
  } finally {
    clearTimeout(retryTimeout);
  }
}

async function enrichExternalProfiles(urls: string[]) {
  const uniqueUrls = Array.from(new Set(urls)).slice(0, 4);
  const profiles = await Promise.all(
    uniqueUrls.map(async (url) => {
      const probe = await fetchText(url, 6000);
      const title = probe.text ? extractTitle(probe.text) : null;
      const description = probe.text ? readMetaTag(probe.text, "description") : null;
      return {
        url,
        title,
        description,
        statusCode: probe.status,
      };
    }),
  );

  const scoredProfiles = profiles.filter((profile) => profile.statusCode !== null && profile.statusCode < 500);
  const confidence = Math.max(0, Math.min(100, 20 + scoredProfiles.length * 20 + uniqueUrls.length * 10));

  return {
    externalProfiles: profiles,
    confidence,
  };
}

async function parseRobots(baseUrl: string) {
  const url = new URL("/robots.txt", baseUrl).toString();
  const result = await fetchText(url, 8000);
  if (!result.ok || !result.text) {
    return { robotsTxt: null, sitemapUrls: [], disallowPaths: [] as string[] };
  }

  const sitemapUrls: string[] = [];
  const disallowPaths: string[] = [];
  for (const rawLine of result.text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sitemapMatch = line.match(/^sitemap:\s*(.+)$/i);
    if (sitemapMatch?.[1]) {
      try {
        sitemapUrls.push(normalizeAbsoluteUrl(baseUrl, sitemapMatch[1].trim()));
      } catch {
        // ignore
      }
      continue;
    }
    const disallowMatch = line.match(/^disallow:\s*(.+)$/i);
    if (disallowMatch?.[1]) {
      disallowPaths.push(disallowMatch[1].trim());
    }
  }
  return { robotsTxt: result.text, sitemapUrls: Array.from(new Set(sitemapUrls)), disallowPaths };
}

function parseSitemapUrls(xml: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const regex = /<loc>([^<]+)<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml))) {
    const loc = String(match[1] ?? "").trim();
    if (!loc) continue;
    try {
      urls.push(normalizeAbsoluteUrl(baseUrl, loc));
    } catch {
      // ignore invalid sitemap URL
    }
  }
  return Array.from(new Set(urls));
}

function collectInternalLinkCandidates(pages: PageSnapshot[], origin: string): string[] {
  const candidates = new Set<string>();
  for (const page of pages) {
    for (const link of page.links) {
      if (isLikelyInternalLink(link, origin) && link !== page.url) {
        candidates.add(link);
      }
    }
  }
  return Array.from(candidates);
}

async function crawlSite(normalizedUrl: string): Promise<DiscoveryResult> {
  const origin = new URL(normalizedUrl).origin;
  const discoveryNotes: string[] = [];
  const renderLayerEnabled = Boolean(getBrowserRenderEndpoint());
  let renderedPages = 0;
  const pageMap = new Map<string, PageSnapshot>();
  const brokenLinks: Array<{ url: string; statusCode: number | null; sourceUrl: string | null }> = [];

  const homepageResult = await fetchText(normalizedUrl);
  if (!homepageResult.ok) {
    throw new Error(`Homepage fetch failed with status ${homepageResult.status}`);
  }

  const homepageRendered = renderLayerEnabled ? await fetchRenderedPage(normalizedUrl) : null;
  const homepageHtml = homepageRendered?.html?.trim() ? homepageRendered.html : homepageResult.text;
  const homepageTitle = extractTitle(homepageHtml);
  const homepageCanonical = readCanonical(homepageHtml, normalizedUrl);
  const homepageMetaDescription = readMetaTag(homepageHtml, "description");
  const homepageNoindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(homepageHtml);
  const homepageNoarchive = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noarchive/i.test(homepageHtml);
  const homepageHeadingsH1 = extractHeadings(homepageHtml, "h1");
  const homepageHeadingsH2 = extractHeadings(homepageHtml, "h2");
  const homepageSchemaTypes = extractSchemaTypes(homepageHtml);
  const homepageHreflangLinks = extractHreflangLinks(homepageHtml, normalizedUrl);
  const homepageEntitySources = extractExternalEntitySources(homepageHtml, normalizedUrl);
  const homepageWordData = extractWordCount(homepageHtml);
  const homepageImages = extractImages(homepageHtml);
  const homepageLinks = extractLinks(homepageHtml, normalizedUrl, 25).filter((link) => isLikelyInternalLink(link, origin));
  const homepageFaqCount = countFaqSignals(homepageHtml);

  const homepage: PageSnapshot = {
    url: normalizedUrl,
    canonicalUrl: homepageCanonical,
    statusCode: homepageResult.status,
    title: homepageTitle,
    metaDescription: homepageMetaDescription,
    wordCount: homepageWordData.wordCount,
    h1Count: homepageHeadingsH1.length,
    h2Count: homepageHeadingsH2.length,
    internalLinksOut: homepageLinks.length,
    internalLinksIn: 0,
    schemaTypes: homepageSchemaTypes,
    pageScore: 0,
    rawMeta: {
      contentType: homepageResult.contentType,
      noindex: homepageNoindex,
      noarchive: homepageNoarchive,
    },
    headings: [...homepageHeadingsH1, ...homepageHeadingsH2].slice(0, 10),
    faqCount: homepageFaqCount,
    imageAltCount: homepageImages.imageAltCount,
    imageCount: homepageImages.imageCount,
    noindex: homepageNoindex,
    canonicalMismatch: Boolean(homepageCanonical && homepageCanonical !== normalizedUrl),
    text: homepageWordData.text,
    hreflangLinks: homepageHreflangLinks,
    chunks: [],
    links: homepageLinks,
  };
  homepage.pageScore = scorePage(homepage);
  pageMap.set(homepage.url, homepage);
  if (homepageRendered?.html) renderedPages += 1;
  if (homepageHreflangLinks.length > 0) discoveryNotes.push(`Hreflang links discovered: ${homepageHreflangLinks.length}`);
  if (homepageEntitySources.sameAsUrls.length > 0) discoveryNotes.push(`External entity sources discovered: ${homepageEntitySources.sameAsUrls.length}`);

  const robots = await parseRobots(normalizedUrl);
  if (robots.robotsTxt) discoveryNotes.push("Robots.txt discovered");
  if (robots.sitemapUrls.length > 0) discoveryNotes.push(`Sitemaps discovered: ${robots.sitemapUrls.length}`);

  const sitemapUrls: string[] = [];
  for (const sitemapUrl of robots.sitemapUrls.slice(0, 3)) {
    const sitemapResult = await fetchText(sitemapUrl, 8000);
    if (!sitemapResult.ok || !sitemapResult.text) continue;
    const discovered = parseSitemapUrls(sitemapResult.text, normalizedUrl);
    for (const discoveredUrl of discovered) {
      if (isLikelyInternalLink(discoveredUrl, origin)) sitemapUrls.push(discoveredUrl);
    }
  }

  const uniqueSitemapUrls = Array.from(new Set(sitemapUrls)).slice(0, 8);
  const candidateUrls = [
    normalizedUrl,
    ...uniqueSitemapUrls,
    ...homepage.links.slice(0, 4),
  ]
    .filter((url) => isLikelyInternalLink(url, origin))
    .filter((url) => !pageMap.has(url));

  for (const url of candidateUrls.slice(0, crawlLimit - 1)) {
    const renderedPage = renderLayerEnabled ? await fetchRenderedPage(url) : null;
    const result = await fetchText(url, 10000);
    if (!result.text) continue;

    const html = renderedPage?.html?.trim() ? renderedPage.html : result.text;
    const title = extractTitle(html);
    const canonicalUrl = readCanonical(html, url);
    const metaDescription = readMetaTag(html, "description");
    const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
    const noarchive = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noarchive/i.test(html);
    const h1 = extractHeadings(html, "h1");
    const h2 = extractHeadings(html, "h2");
    const schemaTypes = extractSchemaTypes(html);
    const hreflangLinks = extractHreflangLinks(html, url);
    const wordData = extractWordCount(html);
    const images = extractImages(html);
    const links = extractLinks(html, url, 25).filter((link) => isLikelyInternalLink(link, origin));
    const faqCount = countFaqSignals(html);

    const page: PageSnapshot = {
      url,
      canonicalUrl,
      statusCode: result.status,
      title,
      metaDescription,
      wordCount: wordData.wordCount,
      h1Count: h1.length,
      h2Count: h2.length,
      internalLinksOut: links.length,
      internalLinksIn: 0,
      schemaTypes,
      pageScore: 0,
      rawMeta: {
        contentType: result.contentType,
        noindex,
        noarchive,
      },
      headings: [...h1, ...h2].slice(0, 10),
      faqCount,
      imageAltCount: images.imageAltCount,
      imageCount: images.imageCount,
      noindex,
      canonicalMismatch: Boolean(canonicalUrl && canonicalUrl !== url),
      text: wordData.text,
      hreflangLinks,
      chunks: [],
      links,
    };
    page.pageScore = scorePage(page);
    pageMap.set(url, page);
    if (renderedPage?.html) renderedPages += 1;
  }

  const pages = Array.from(pageMap.values());
  const internalLinkCandidates = collectInternalLinkCandidates(pages, origin).filter((link) => !pageMap.has(link));
  for (const candidate of internalLinkCandidates.slice(0, 12)) {
    const probe = await fetchStatus(candidate, 5000);
    const sourcePage = pages.find((page) => page.links.includes(candidate))?.url ?? null;
    if (probe.status === null || probe.status >= 400) {
      brokenLinks.push({ url: candidate, statusCode: probe.status, sourceUrl: sourcePage });
    }
  }

  for (const page of pages) {
    page.internalLinksIn = getInternalLinksIn(pages, page.url);
    const chunks = splitIntoChunks(page.text, 3, page.url === normalizedUrl ? 650 : 500);
    page.chunks = await Promise.all(
      chunks.map(async (chunkText, index) => {
        const scores = contentChunkScores(page, chunkText);
        const hash = await hashText(`${page.url}::${index}::${chunkText}`);
        return {
          index,
          text: chunkText,
          hash,
          entityTags: scores.entityTags,
          answerabilityScore: scores.answerabilityScore,
          retrievalRelevanceScore: scores.retrievalRelevanceScore,
        };
      }),
    );
  }

  const entityEnrichment = homepageEntitySources.sameAsUrls.length > 0
    ? await enrichExternalProfiles(homepageEntitySources.sameAsUrls)
    : { externalProfiles: [], confidence: 0 };

  if (brokenLinks.length > 0) discoveryNotes.push(`Broken links detected: ${brokenLinks.length}`);
  if (entityEnrichment.externalProfiles.length > 0) discoveryNotes.push(`External profiles enriched: ${entityEnrichment.externalProfiles.length}`);
  if (renderedPages > 0) discoveryNotes.push(`Browser render layer applied to ${renderedPages} page(s)`);

  return {
    robotsTxt: robots.robotsTxt,
    sitemapUrls: robots.sitemapUrls,
    sitemapDiscoveredUrls: uniqueSitemapUrls,
    pageSnapshots: pages,
    brokenLinks,
    entityEnrichment: {
      brandName: homepageEntitySources.brandName,
      publisherName: homepageEntitySources.publisherName,
      sameAsUrls: homepageEntitySources.sameAsUrls,
      externalProfiles: entityEnrichment.externalProfiles,
      confidence: entityEnrichment.confidence,
    },
    discoveryNotes,
    rendering: {
      enabled: renderedPages > 0,
      pagesRendered: renderedPages,
    },
  };
}

function buildAnalysisFindings(
  pages: PageSnapshot[],
  psiJson: any,
  discovery: DiscoveryResult,
  vertical: Vertical,
): AnalysisFinding[] {
  const findings: AnalysisFinding[] = [];
  const homepage = pages[0];
  const schemaOnHomepage = homepage?.schemaTypes ?? [];
  const totalFaq = pages.reduce((sum, page) => sum + page.faqCount, 0);
  const totalSchema = pages.reduce((sum, page) => sum + page.schemaTypes.length, 0);
  const totalHreflang = pages.reduce((sum, page) => sum + page.hreflangLinks.length, 0);
  const pagesWithHreflang = pages.filter((page) => page.hreflangLinks.length > 0).length;
  const totalWordCount = pages.reduce((sum, page) => sum + page.wordCount, 0);
  const pagesWithMeta = pages.filter((page) => Boolean(page.metaDescription)).length;
  const pagesWithTitle = pages.filter((page) => Boolean(page.title)).length;
  const pagesWithOneH1 = pages.filter((page) => page.h1Count === 1).length;
  const pagesWithCanonical = pages.filter((page) => Boolean(page.canonicalUrl)).length;
  const pagesWithNoindex = pages.filter((page) => page.noindex).length;
  const pagesWithSchema = pages.filter((page) => page.schemaTypes.length > 0).length;
  const pagesWithManyChunks = pages.filter((page) => page.chunks.length > 0).length;
  const avgPageScore = pages.length
    ? Math.round(pages.reduce((sum, page) => sum + page.pageScore, 0) / pages.length)
    : 0;
  const brokenLinkCount = discovery.brokenLinks.length;
  const entitySignalCount = discovery.entityEnrichment.sameAsUrls.length;

  if (!discovery.robotsTxt) {
    findings.push({
      category: "technical",
      severity: "medium",
      signalKey: "robots_missing",
      title: "robots.txt not discovered",
      description: "The crawler could not fetch robots.txt, so crawl instructions and sitemap hints are unknown.",
      recommendation: "Add a valid robots.txt file with sitemap declarations and clear crawl directives.",
      evidence: { type: "robots", pages: pages.length },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (brokenLinkCount > 0) {
    findings.push({
      category: "technical",
      severity: brokenLinkCount > 3 ? "high" : "medium",
      signalKey: "broken_links",
      title: "Broken internal links detected",
      description: `${brokenLinkCount} internal link(s) returned an error or could not be probed.`,
      recommendation: "Fix or redirect broken internal links so crawlers and users can reach the intended pages.",
      evidence: { brokenLinkCount, brokenLinks: discovery.brokenLinks.slice(0, 5) },
      pageUrl: discovery.brokenLinks[0]?.sourceUrl ?? homepage?.url ?? null,
    });
  }

  if (discovery.sitemapUrls.length === 0) {
    findings.push({
      category: "technical",
      severity: "medium",
      signalKey: "sitemap_missing",
      title: "No sitemap discovered",
      description: "No sitemap URL was discovered from robots.txt or the homepage crawl.",
      recommendation: "Add and reference a sitemap.xml so crawlers can discover key pages quickly.",
      evidence: { type: "sitemap", pages: pages.length },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (totalHreflang > 0 && pagesWithHreflang < pages.length) {
    findings.push({
      category: "technical",
      severity: "medium",
      signalKey: "hreflang_incomplete",
      title: "Hreflang coverage is incomplete",
      description: "Some crawled pages expose hreflang alternates, but not all crawled pages do.",
      recommendation: "Make hreflang annotations consistent across localized pages and confirm reciprocal alternates.",
      evidence: { totalHreflang, pagesWithHreflang, totalPages: pages.length },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (pagesWithMeta < pages.length) {
    findings.push({
      category: "content",
      severity: "medium",
      signalKey: "meta_description_gap",
      title: "Missing meta descriptions",
      description: `${pages.length - pagesWithMeta} crawled page(s) are missing meta descriptions.`,
      recommendation: "Write unique meta descriptions for the homepage and top commercial pages.",
      evidence: { pagesWithMeta, totalPages: pages.length },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (entitySignalCount === 0) {
    findings.push({
      category: "ai",
      severity: "low",
      signalKey: "entity_enrichment_gap",
      title: "External entity signals are limited",
      description: "No external entity profiles or sameAs sources were detected from structured data.",
      recommendation: "Add Organization or Brand schema with sameAs links to official profiles and knowledge sources.",
      evidence: {
        brandName: discovery.entityEnrichment.brandName,
        publisherName: discovery.entityEnrichment.publisherName,
        confidence: discovery.entityEnrichment.confidence,
      },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (pagesWithOneH1 < pages.length) {
    findings.push({
      category: "content",
      severity: "high",
      signalKey: "heading_hierarchy_gap",
      title: "Heading hierarchy needs work",
      description: `${pages.length - pagesWithOneH1} crawled page(s) do not have a single clear H1 structure.`,
      recommendation: "Use one clear H1 per page and align H2/H3s to the document outline.",
      evidence: { pagesWithOneH1, totalPages: pages.length },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (pagesWithSchema === 0) {
    findings.push({
      category: "ai",
      severity: "high",
      signalKey: "schema_gap",
      title: "Structured data is missing",
      description: "No JSON-LD schema types were detected on the crawled pages.",
      recommendation: "Add Organization, WebPage, and page-type schema to improve machine readability.",
      evidence: { schemaTypesOnHomepage: schemaOnHomepage, totalSchema },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (totalFaq === 0) {
    findings.push({
      category: "ai",
      severity: "medium",
      signalKey: "faq_gap",
      title: "FAQ signals are limited",
      description: "No clear FAQ content was detected on the crawled pages.",
      recommendation: "Add FAQ sections to pages that answer common buyer or visitor questions.",
      evidence: { totalFaq },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (pages.some((page) => page.wordCount < 250)) {
    findings.push({
      category: "content",
      severity: "medium",
      signalKey: "thin_content",
      title: "Some pages are thin",
      description: "At least one crawled page has low word count, which can weaken retrieval and relevance.",
      recommendation: "Expand thin pages with context, examples, and clearer section structure.",
      evidence: { avgPageScore, totalWordCount },
      pageUrl: pages.find((page) => page.wordCount < 250)?.url ?? homepage?.url ?? null,
    });
  }

  const accessibilityCategory = psiJson?.lighthouseResult?.categories?.accessibility?.score;
  if (typeof accessibilityCategory === "number" && accessibilityCategory < 0.9) {
    findings.push({
      category: "technical",
      severity: accessibilityCategory < 0.5 ? "high" : "medium",
      signalKey: "accessibility_score",
      title: "Accessibility score is below ideal",
      description: "Lighthouse reports accessibility issues that can also hinder AI parsing and user navigation.",
      recommendation: "Fix contrast, labels, and semantic structure issues flagged by Lighthouse.",
      evidence: { accessibilityScore: Math.round(accessibilityCategory * 100) },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (pagesWithCanonical < pages.length) {
    findings.push({
      category: "technical",
      severity: "medium",
      signalKey: "canonical_gap",
      title: "Canonical coverage is incomplete",
      description: "One or more crawled pages do not expose a canonical URL.",
      recommendation: "Set canonical tags on all key pages to reduce ambiguity and duplication.",
      evidence: { pagesWithCanonical, totalPages: pages.length },
      pageUrl: homepage?.url ?? null,
    });
  }

  if (pagesWithNoindex > 0) {
    findings.push({
      category: "technical",
      severity: "high",
      signalKey: "noindex_detected",
      title: "Noindex directives detected",
      description: `${pagesWithNoindex} crawled page(s) include noindex directives.`,
      recommendation: "Review any noindex tags to make sure important pages remain discoverable.",
      evidence: { pagesWithNoindex },
      pageUrl: pages.find((page) => page.noindex)?.url ?? homepage?.url ?? null,
    });
  }

  const verticalSpecificMessage =
    vertical === "ecommerce"
      ? "Product and collection pages should include schema, clear offers, and crawlable internal links."
      : vertical === "saas"
        ? "Pricing, docs, and feature pages should expose clear product value and FAQ depth."
        : vertical === "local"
          ? "Service and location pages should reinforce local trust signals and NAP consistency."
          : vertical === "content"
            ? "Article clusters should deepen topical authority and make the most important ideas easy to cite."
            : "Top pages should expose enough structure and context for AI systems to understand the site.";

  findings.push({
    category: "ai",
    severity: pagesWithManyChunks > 0 ? "low" : "medium",
    signalKey: "vertical_ai_visibility",
    title: "Vertical-specific AI visibility opportunity",
    description: verticalSpecificMessage,
    recommendation: "Tune the top pages for the site's vertical so AI systems can interpret the content with less ambiguity.",
    evidence: { vertical, pagesWithSchema, pagesWithMeta, pagesWithOneH1 },
    pageUrl: homepage?.url ?? null,
  });

  return findings;
}

function buildScoreBreakdown(
  pages: PageSnapshot[],
  findings: AnalysisFinding[],
  psiJson: any,
  vertical: Vertical,
  discovery: DiscoveryResult,
) {
  const homepage = pages[0];
  const crawlability = homepage?.pageScore ?? 50;
  const technicalSignals = pages.reduce((sum, page) => sum + (page.canonicalUrl ? 1 : 0) + (page.noindex ? -1 : 1), 0);
  const contentSignals = pages.reduce((sum, page) => sum + (page.wordCount > 250 ? 1 : 0) + page.h1Count + page.h2Count, 0);
  const aiSignals = pages.reduce((sum, page) => sum + page.schemaTypes.length * 2 + page.faqCount * 2 + page.chunks.length, 0);
  const hreflangCoverage = pages.length ? pages.filter((page) => page.hreflangLinks.length > 0).length / pages.length : 0;
  const entityConfidence = discovery.entityEnrichment.confidence;
  const brokenLinkPenalty = Math.min(18, discovery.brokenLinks.length * 4);

  const performance = Math.round((psiJson?.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
  const seo = Math.round((psiJson?.lighthouseResult?.categories?.seo?.score ?? 0) * 100);
  const best = Math.round((psiJson?.lighthouseResult?.categories?.["best-practices"]?.score ?? 0) * 100);
  const accessibility = Math.round((psiJson?.lighthouseResult?.categories?.accessibility?.score ?? 0) * 100);

  const technicalVisibility = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (performance * 0.35) +
          (seo * 0.25) +
          (best * 0.15) +
          (accessibility * 0.15) +
          (Math.min(100, Math.max(0, crawlability)) * 0.1),
        - brokenLinkPenalty,
      ),
    ),
  );

  const contentVisibility = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        30 + (contentSignals * 2.2) + (pages.filter((page) => page.metaDescription).length * 2) - findings.filter((finding) => finding.category === "content").length * 8,
      ),
    ),
  );

  const aiUnderstanding = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        25 +
          (aiSignals * 1.8) +
          (pages.filter((page) => page.schemaTypes.length > 0).length * 6) +
          (pages.filter((page) => page.faqCount > 0).length * 4) +
          (entityConfidence * 0.25) -
          findings.filter((finding) => finding.category === "ai").length * 7,
      ),
    ),
  );

  const citationVisibility = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        20 +
          (pages.reduce((sum, page) => sum + page.chunks.reduce((chunkSum, chunk) => chunkSum + chunk.retrievalRelevanceScore, 0), 0) * 10) +
          (pages.filter((page) => page.schemaTypes.length > 0).length * 4) +
          (hreflangCoverage * 5) -
          findings.filter((finding) => finding.signalKey === "schema_gap" || finding.signalKey === "faq_gap").length * 10,
      ),
    ),
  );

  const overall = Math.round(
    (technicalVisibility * 0.25) +
      (contentVisibility * 0.25) +
      (aiUnderstanding * 0.25) +
      (citationVisibility * 0.25),
  );

  const verticalLift =
    vertical === "ecommerce"
      ? Math.min(10, pages.filter((page) => page.schemaTypes.some((type) => /Product|Offer|Review/i.test(type))).length * 2)
      : vertical === "saas"
        ? Math.min(10, pages.filter((page) => /pricing|docs|feature|api/i.test(`${page.title ?? ""} ${page.url}`)).length * 2)
        : vertical === "local"
          ? Math.min(10, pages.filter((page) => /location|contact|service/i.test(`${page.title ?? ""} ${page.url}`)).length * 2)
          : vertical === "content"
            ? Math.min(10, pages.filter((page) => page.faqCount > 0).length * 2)
            : 0;

  return {
    overallScore: Math.max(0, Math.min(100, overall + verticalLift)),
    technicalVisibility,
    contentVisibility,
    aiUnderstanding,
    citationVisibility,
    crawlability,
    performance,
    seo,
    best,
    accessibility,
  };
}

async function canCreateFullReport(
  supabase: any,
  userId: string | null,
  now: Date,
): Promise<{ allowed: boolean; exhausted: boolean }> {
  if (!userId) return { allowed: false, exhausted: false };

  const { data, error } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, plan, plan_slug, report_quota, reports_used, lifetime_access")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error || !isSubscriptionActive((data ?? null) as SubscriptionRow | null, now)) {
    return { allowed: false, exhausted: false };
  }

  const row = (data ?? null) as SubscriptionRow | null;
  if (!row) return { allowed: false, exhausted: false };

  if (row.lifetime_access) {
    return { allowed: true, exhausted: false };
  }

  const quota = typeof row.report_quota === "number" ? row.report_quota : Number(row.report_quota ?? 0);
  const used = typeof row.reports_used === "number" ? row.reports_used : Number(row.reports_used ?? 0);
  if (quota > 0 && used < quota) {
    return { allowed: true, exhausted: false };
  }

  return { allowed: false, exhausted: true };
}

async function consumePaidReportCredit(supabase: any, userId: string | null, reportId: string) {
  if (!userId) return false;

  const { data: finalized, error } = await supabase.rpc("finalize_paid_report_unlock", {
    p_user_id: userId,
    p_report_id: reportId,
  });
  if (error || finalized !== true) {
    console.error("finalize_paid_report_unlock failed", error);
    return false;
  }

  return true;
}

function isSubscriptionActive(row: SubscriptionRow | null, now: Date): boolean {
  if (!row) return false;
  const status = String(row.status ?? "").toLowerCase();
  const activeStatus = status === "active" || status === "trialing";
  if (!activeStatus) return false;
  const endRaw = String(row.current_period_end ?? "").trim();
  if (!endRaw) return true;
  const end = new Date(endRaw);
  if (Number.isNaN(end.getTime())) return true;
  return end.getTime() > now.getTime();
}

async function getSubscriptionTier(supabase: any, userId: string | null): Promise<string> {
  if (!userId) return "free";
  const { data } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, plan, plan_slug")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .order("updated_at", { ascending: false })
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!isSubscriptionActive((data ?? null) as SubscriptionRow | null, new Date())) return "free";
  return getAccessTier((data as any)?.plan_slug ?? null, (data as any)?.plan ?? null);
}

async function createScanJob(supabase: any, payload: Record<string, unknown>) {
  const { data, error } = await supabase.from("scan_jobs").insert(payload).select("id").single();
  if (error || !data?.id) throw new Error(error?.message ?? "Failed to create scan job");
  return String(data.id);
}

async function updateScanJob(supabase: any, scanJobId: string, patch: Record<string, unknown>) {
  await supabase.from("scan_jobs").update(patch).eq("id", scanJobId);
}

async function isScanCancelled(supabase: any, scanJobId: string | null) {
  if (!scanJobId) return false;
  const { data } = await supabase
    .from("scan_cancellations")
    .select("scan_job_id")
    .eq("scan_job_id", scanJobId)
    .limit(1)
    .maybeSingle();
  return Boolean(data?.scan_job_id);
}

async function cancelScanResponse(supabase: any, scanJobId: string | null, nowIso: string) {
  if (scanJobId) {
    await updateScanJob(supabase, scanJobId, {
      status: "canceled",
      progress: 100,
      error_code: "SCAN_CANCELED",
      error_message: "Scan stopped by user",
      completed_at: nowIso,
    });
  }

  return new Response(JSON.stringify({ error: "SCAN_CANCELED", message: "Scan stopped by user" }), {
    status: 499,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function persistReportArtifacts(
  supabase: any,
  reportId: string,
  pages: PageSnapshot[],
  findings: AnalysisFinding[],
  nowIso: string,
) {
  const reportPages: Array<Record<string, unknown>> = [];
  const pageIdByUrl = new Map<string, string>();

  for (const page of pages) {
    const { data, error } = await supabase
      .from("report_pages")
      .insert({
        report_id: reportId,
        url: page.url,
        canonical_url: page.canonicalUrl,
        status_code: page.statusCode,
        depth: page.url === pages[0]?.url ? 0 : 1,
        title: page.title,
        meta_description: page.metaDescription,
        word_count: page.wordCount,
        h1_count: page.h1Count,
        h2_count: page.h2Count,
        internal_links_out: page.internalLinksOut,
        internal_links_in: page.internalLinksIn,
        schema_types: page.schemaTypes,
        page_score: page.pageScore,
        raw_meta: page.rawMeta,
        created_at: nowIso,
      })
      .select("id")
      .single();

    if (error || !data?.id) throw new Error(error?.message ?? `Failed to insert page ${page.url}`);
    pageIdByUrl.set(page.url, String(data.id));
    reportPages.push({ id: String(data.id), ...page });
  }

  for (const finding of findings) {
    const pageId = finding.pageUrl ? pageIdByUrl.get(finding.pageUrl) ?? null : null;
    const { error } = await supabase.from("report_findings").insert({
      report_id: reportId,
      page_id: pageId,
      category: finding.category,
      severity: finding.severity,
      signal_key: finding.signalKey,
      title: finding.title,
      description: finding.description,
      recommendation: finding.recommendation,
      evidence: finding.evidence,
      created_at: nowIso,
    });
    if (error) throw new Error(error.message);
  }

  for (const page of pages) {
    const pageId = pageIdByUrl.get(page.url) ?? null;
    for (const chunk of page.chunks) {
      const { error } = await supabase.from("content_chunks").insert({
        report_id: reportId,
        page_id: pageId,
        chunk_index: chunk.index,
        chunk_text: chunk.text,
        chunk_hash: chunk.hash,
        entity_tags: chunk.entityTags,
        embedding_model: "none",
        answerability_score: chunk.answerabilityScore,
        retrieval_relevance_score: chunk.retrievalRelevanceScore,
        created_at: nowIso,
      });
      if (error) throw new Error(error.message);
    }
  }

  return { reportPages, pageIdByUrl };
}

async function cloneReportArtifacts(supabase: any, sourceReportId: string, targetReportId: string, nowIso: string) {
  const { data: sourcePages, error: pagesErr } = await supabase
    .from("report_pages")
    .select("*")
    .eq("report_id", sourceReportId)
    .order("created_at", { ascending: true });
  if (pagesErr) throw new Error(pagesErr.message);

  const pageIdMap = new Map<string, string>();
  for (const page of sourcePages ?? []) {
    const { data, error } = await supabase
      .from("report_pages")
      .insert({
        report_id: targetReportId,
        url: page.url,
        canonical_url: page.canonical_url,
        status_code: page.status_code,
        depth: page.depth,
        title: page.title,
        meta_description: page.meta_description,
        word_count: page.word_count,
        h1_count: page.h1_count,
        h2_count: page.h2_count,
        internal_links_out: page.internal_links_out,
        internal_links_in: page.internal_links_in,
        schema_types: page.schema_types,
        page_score: page.page_score,
        raw_meta: page.raw_meta,
        created_at: nowIso,
      })
      .select("id")
      .single();
    if (error || !data?.id) throw new Error(error?.message ?? "Failed to clone page");
    pageIdMap.set(String(page.id), String(data.id));
  }

  const { data: findings, error: findingsErr } = await supabase
    .from("report_findings")
    .select("*")
    .eq("report_id", sourceReportId);
  if (findingsErr) throw new Error(findingsErr.message);

  for (const finding of findings ?? []) {
    const pageId = finding.page_id ? pageIdMap.get(String(finding.page_id)) ?? null : null;
    const { error } = await supabase.from("report_findings").insert({
      report_id: targetReportId,
      page_id: pageId,
      category: finding.category,
      severity: finding.severity,
      signal_key: finding.signal_key,
      title: finding.title,
      description: finding.description,
      recommendation: finding.recommendation,
      evidence: finding.evidence,
      created_at: nowIso,
    });
    if (error) throw new Error(error.message);
  }

  const { data: chunks, error: chunksErr } = await supabase
    .from("content_chunks")
    .select("*")
    .eq("report_id", sourceReportId)
    .order("created_at", { ascending: true });
  if (chunksErr) throw new Error(chunksErr.message);

  for (const chunk of chunks ?? []) {
    const pageId = chunk.page_id ? pageIdMap.get(String(chunk.page_id)) ?? null : null;
    const { error } = await supabase.from("content_chunks").insert({
      report_id: targetReportId,
      page_id: pageId,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      chunk_hash: chunk.chunk_hash,
      entity_tags: chunk.entity_tags,
      embedding_model: chunk.embedding_model,
      answerability_score: chunk.answerability_score,
      retrieval_relevance_score: chunk.retrieval_relevance_score,
      created_at: nowIso,
    });
    if (error) throw new Error(error.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
  const psiKey = Deno.env.get("PAGESPEED_API_KEY");

  if (!serviceRoleKey) {
    return new Response("Missing service role key", { status: 500, headers: corsHeaders });
  }
  if (!psiKey) {
    return new Response("Missing PageSpeed API key", { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const accessToken = authHeader.replace("Bearer ", "").trim();
  let userId: string | null = null;
  if (accessToken) {
    const { data: authUser } = await supabase.auth.getUser(accessToken);
    userId = authUser?.user?.id ?? null;
  }

  let url: string;
  let visitorId: string | null = null;
  let requestedScanJobId: string | null = null;
  try {
    const body = await req.json();
    url = String(body.url ?? "");
    const candidate = String(body.visitor_id ?? "").trim();
    visitorId = candidate && isUuid(candidate) ? candidate : null;
    const scanJobCandidate = String(body.scan_job_id ?? "").trim();
    requestedScanJobId = scanJobCandidate && isUuid(scanJobCandidate) ? scanJobCandidate : null;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!url) {
    return new Response(JSON.stringify({ error: "url is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  if (!userId && !visitorId) {
    return new Response(JSON.stringify({ error: "visitor_id is required for guests" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  let normalized: string;
  try {
    normalized = normalizeUrl(url);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const freshSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();
  const nowIso = now.toISOString();
  const vertical = detectVertical(normalized);

  const paidScanAccess = await canCreateFullReport(supabase, userId, now);
  const shouldUnlockFullReport = !!userId && paidScanAccess.allowed;
  const scanMode = shouldUnlockFullReport ? "full" : "preview";
  let scanJobId: string | null = null;

  try {
    scanJobId = await createScanJob(supabase, {
      ...(requestedScanJobId ? { id: requestedScanJobId } : {}),
      user_id: userId,
      visitor_id: userId ? null : visitorId,
      url,
      normalized_url: normalized,
      vertical,
      mode: scanMode,
      status: "queued",
      progress: 0,
      created_at: nowIso,
      started_at: nowIso,
      source_versions: { scan: scanVersion, crawler: crawlerVersion, psi: psiVersion },
    });
  } catch (error) {
    console.error("scan job insert error", error);
    return new Response(
      JSON.stringify({ error: "Failed to create scan job", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  const updateJob = async (patch: Record<string, unknown>) => {
    if (!scanJobId) return;
    await updateScanJob(supabase, scanJobId, patch);
  };

  await updateJob({ status: "running", progress: 5 });

  const { data: existing, error: existingErr } = userId
    ? await supabase.from("websites").select("*").eq("normalized_url", normalized).eq("user_id", userId).limit(1).maybeSingle()
    : await supabase.from("websites").select("*").eq("normalized_url", normalized).eq("visitor_id", visitorId).limit(1).maybeSingle();

  let site = existing;
  if (!site) {
    const { data: inserted, error: insertErr } = await supabase
      .from("websites")
      .insert({
        normalized_url: normalized,
        url,
        user_id: userId,
        visitor_id: userId ? null : visitorId,
        vertical,
        created_at: nowIso,
        last_scanned_at: nowIso,
      })
      .select()
      .single();

    if (insertErr || !inserted) {
      await updateJob({
        status: "failed",
        progress: 100,
        error_code: "WEBSITE_SAVE_FAILED",
        error_message: insertErr?.message ?? "Failed to upsert website",
        completed_at: nowIso,
      });
      return new Response(
        JSON.stringify({ error: "Failed to upsert website", details: insertErr?.message ?? null }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    site = inserted;
  } else {
    await supabase.from("websites").update({ last_scanned_at: nowIso, url, vertical }).eq("id", site.id);
  }

  await updateJob({ website_id: site.id, progress: 10 });
  if (existingErr) console.error("website lookup error", existingErr);

  const { data: cached } = await supabase
    .from("reports")
    .select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, ai_summary, recommendations, generated_at, source_versions, websites!inner(normalized_url)")
    .eq("status", "completed")
    .gt("generated_at", freshSince)
    .eq("websites.normalized_url", normalized)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cached && hasAllCategoryScores((cached as any).raw_scan_data) && isCurrentSourceVersion((cached as any).source_versions)) {
    if (await isScanCancelled(supabase, scanJobId)) {
      return await cancelScanResponse(supabase, scanJobId, nowIso);
    }

    const sourceReportId = String((cached as any).id);
    const cachedPayload = cached as any;
    const { websites: _w, id: _id, website_id: _wid, generated_at: _ga, ...rest } = cachedPayload;
    const insertPayload = {
      id: crypto.randomUUID(),
      ...rest,
      website_id: site.id,
      generated_at: nowIso,
      visitor_id: userId ? null : visitorId,
      is_cached: true,
      generated_by: userId ? "authenticated" : "visitor",
      scan_job_id: scanJobId,
      report_level: shouldUnlockFullReport ? "full" : "preview",
      access_tier_required: await getSubscriptionTier(supabase, userId),
      source_versions: { scan: scanVersion, crawler: crawlerVersion, psi: psiVersion },
    };

    const { data: cloned, error: cloneErr } = await supabase.from("reports").insert(insertPayload).select().single();
    if (cloneErr || !cloned) {
      await updateJob({
        status: "failed",
        progress: 100,
        error_code: "REPORT_SAVE_FAILED",
        error_message: cloneErr?.message ?? "Failed to save report",
        completed_at: nowIso,
      });
      return new Response(JSON.stringify({ error: "Failed to save report", details: cloneErr?.message ?? null }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (await isScanCancelled(supabase, scanJobId)) {
      await supabase.from("reports").delete().eq("id", cloned.id);
      return await cancelScanResponse(supabase, scanJobId, nowIso);
    }

    if (shouldUnlockFullReport && userId) {
      const { error: cachedUnlockErr } = await supabase.rpc("record_cached_report_unlock", {
        p_user_id: userId,
        p_report_id: String(cloned.id),
        p_unlock_reason: "cached_rescan_24h",
      });
      if (cachedUnlockErr) console.error("record_cached_report_unlock failed", cachedUnlockErr);
    }

    try {
      await cloneReportArtifacts(supabase, sourceReportId, String(cloned.id), nowIso);
    } catch (error) {
      await updateJob({
        status: "failed",
        progress: 100,
        error_code: "ARTIFACT_CLONE_FAILED",
        error_message: error instanceof Error ? error.message : String(error),
        completed_at: nowIso,
      });
      return new Response(JSON.stringify({ error: "Failed to clone report artifacts", details: error instanceof Error ? error.message : String(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    await updateJob({ status: "completed", progress: 100, completed_at: nowIso });
    return new Response(JSON.stringify({ ...(cloned as any), cached: true, credit_used: false }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  await updateJob({ progress: 20 });

  let discovery: DiscoveryResult;
  try {
    discovery = await crawlSite(normalized);
  } catch (error) {
    console.error("crawl failed", error);
    await updateJob({
      status: "failed",
      progress: 100,
      error_code: "CRAWL_FAILED",
      error_message: error instanceof Error ? error.message : String(error),
      completed_at: nowIso,
    });
    return new Response(JSON.stringify({ error: "Failed to crawl website", details: error instanceof Error ? error.message : String(error) }), {
      status: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  await updateJob({ progress: 45 });

  let psiFailureMessage: string | null = null;
  let psiJson: any = {};

  const psiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(normalized)}` +
    `&strategy=mobile` +
    `&category=performance` +
    `&category=seo` +
    `&category=best-practices` +
    `&category=accessibility` +
    `&key=${psiKey}`;

  try {
    const psiRes = await fetch(psiUrl);
    if (!psiRes.ok) {
      const errorText = await psiRes.text();
      console.error("PSI failed", psiRes.status, errorText);
      psiFailureMessage = "PageSpeed data was unavailable";
    } else {
      psiJson = await psiRes.json();
    }
  } catch (error) {
    console.error("PSI request error", error);
    psiFailureMessage = "PageSpeed data was unavailable";
  }
  const perf = Math.round((psiJson?.lighthouseResult?.categories?.performance?.score ?? 0) * 100);
  const seo = Math.round((psiJson?.lighthouseResult?.categories?.seo?.score ?? 0) * 100);
  const best = Math.round((psiJson?.lighthouseResult?.categories?.["best-practices"]?.score ?? 0) * 100);
  const a11y = Math.round((psiJson?.lighthouseResult?.categories?.accessibility?.score ?? 0) * 100);
  const weights = getWeights(vertical);
  const ai = Math.round(perf * weights.perf + seo * weights.seo + best * weights.best + a11y * weights.a11y);
  const recommendations = buildRecommendations(psiJson);
  const findings = buildAnalysisFindings(discovery.pageSnapshots, psiJson, discovery, vertical);
  const scoreBreakdown = buildScoreBreakdown(discovery.pageSnapshots, findings, psiJson, vertical, discovery);

  const previewPayload = {
    url: normalized,
    vertical,
    summary: `AI visibility score ${scoreBreakdown.overallScore}/100 based on technical, content, AI, and citation visibility signals.`,
    pages_crawled: discovery.pageSnapshots.length,
    sitemap_urls: discovery.sitemapUrls.length,
    top_findings: findings.slice(0, 5),
    score_breakdown: scoreBreakdown,
    recommendations: recommendations.slice(0, 5),
  };

  const rawScanData = {
    ...psiJson,
    rankio: {
      vertical,
      crawler_version: crawlerVersion,
      scanned_at: nowIso,
      pages_crawled: discovery.pageSnapshots.length,
      psi_error: psiFailureMessage,
      rendering: discovery.rendering,
    },
    crawler: {
      robotsTxt: discovery.robotsTxt,
      sitemapUrls: discovery.sitemapUrls,
      sitemapDiscoveredUrls: discovery.sitemapDiscoveredUrls,
      brokenLinks: discovery.brokenLinks,
      entityEnrichment: discovery.entityEnrichment,
      discoveryNotes: discovery.discoveryNotes,
      rendering: discovery.rendering,
      pages: discovery.pageSnapshots.map((page) => ({
        url: page.url,
        canonicalUrl: page.canonicalUrl,
        statusCode: page.statusCode,
        title: page.title,
        metaDescription: page.metaDescription,
        wordCount: page.wordCount,
        h1Count: page.h1Count,
        h2Count: page.h2Count,
        internalLinksOut: page.internalLinksOut,
        internalLinksIn: page.internalLinksIn,
        schemaTypes: page.schemaTypes,
        pageScore: page.pageScore,
        faqCount: page.faqCount,
        imageAltCount: page.imageAltCount,
        imageCount: page.imageCount,
        noindex: page.noindex,
        canonicalMismatch: page.canonicalMismatch,
        hreflangLinks: page.hreflangLinks,
      })),
    },
    analysis: {
      findings,
      scoreBreakdown,
    },
  };

  const aiSummary = stripMarkdownLinks(
    `${psiFailureMessage ? "PageSpeed data was unavailable, so this report is based on crawler and content signals. " : ""}AI visibility score ${scoreBreakdown.overallScore}/100 based on Performance ${perf}, SEO ${seo}, Best Practices ${best}, Accessibility ${a11y}. ${findings[0]?.title ? `Top issue: ${findings[0].title}.` : ""}`,
  );

  const reportLevel = "preview";
  const accessTierRequired = await getSubscriptionTier(supabase, userId);

  if (await isScanCancelled(supabase, scanJobId)) {
    return await cancelScanResponse(supabase, scanJobId, nowIso);
  }

  const insertPayload = {
    id: crypto.randomUUID(),
    website_id: site.id,
    scan_job_id: scanJobId,
    report_level: reportLevel,
    access_tier_required: accessTierRequired,
    status: "completed",
    performance_score: perf,
    seo_score: seo,
    technical_score: best,
    ai_score: scoreBreakdown.overallScore,
    raw_scan_data: rawScanData,
    preview_payload: previewPayload,
    score_breakdown: {
      technical_visibility: scoreBreakdown.technicalVisibility,
      content_visibility: scoreBreakdown.contentVisibility,
      ai_understanding: scoreBreakdown.aiUnderstanding,
      citation_visibility: scoreBreakdown.citationVisibility,
      overall_score: scoreBreakdown.overallScore,
      vertical,
    },
    source_versions: {
      scan: scanVersion,
      crawler: crawlerVersion,
      psi: psiVersion,
    },
    ai_summary: aiSummary,
    recommendations: [
      ...recommendations,
      ...findings.slice(0, 10).map((finding) => ({
        title: finding.title,
        severity:
          finding.severity === "critical"
            ? "High"
            : finding.severity === "high"
              ? "High"
              : finding.severity === "medium"
                ? "Medium"
                : "Good",
        description: finding.description,
        recommendation: finding.recommendation,
        category: finding.category,
      })),
    ],
    is_cached: false,
    generated_by: userId ? "authenticated" : "visitor",
    generated_at: nowIso,
    visitor_id: userId ? null : visitorId,
  };

  const { data: report, error: repErr } = await supabase.from("reports").insert(insertPayload).select().single();
  if (repErr || !report) {
    console.error("insert report error", repErr);
    await updateJob({
      status: "failed",
      progress: 100,
      error_code: "REPORT_SAVE_FAILED",
      error_message: repErr?.message ?? "Failed to save report",
      completed_at: nowIso,
    });
    return new Response(JSON.stringify({ error: "Failed to save report", details: repErr?.message ?? null }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (await isScanCancelled(supabase, scanJobId)) {
    await supabase.from("reports").delete().eq("id", report.id);
    return await cancelScanResponse(supabase, scanJobId, nowIso);
  }

  await updateJob({ progress: 75 });

  try {
    await persistReportArtifacts(supabase, String(report.id), discovery.pageSnapshots, findings, nowIso);
  } catch (error) {
    console.error("persist report artifacts error", error);
    await updateJob({
      status: "failed",
      progress: 100,
      error_code: "ARTIFACT_SAVE_FAILED",
      error_message: error instanceof Error ? error.message : String(error),
      completed_at: nowIso,
    });
    return new Response(
      JSON.stringify({ error: "Failed to save report artifacts", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }

  if (await isScanCancelled(supabase, scanJobId)) {
    await supabase.from("reports").delete().eq("id", report.id);
    return await cancelScanResponse(supabase, scanJobId, nowIso);
  }

  const unlocked = shouldUnlockFullReport && await consumePaidReportCredit(supabase, userId, String(report.id));
  const responseReport = unlocked ? { ...(report as any), report_level: "full" } : report;
  await updateJob({ status: "completed", progress: 100, completed_at: nowIso });

  return new Response(JSON.stringify({ ...(responseReport as any as ReportRow), cached: false, credit_used: unlocked }), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});



