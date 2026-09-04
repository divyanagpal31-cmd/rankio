const fs = require('fs');
const path = 'supabase/functions/scan/index.ts';
let text = fs.readFileSync(path, 'utf8');
const nl = '\r\n';

function replaceOnce(oldText, newText) {
  if (!text.includes(oldText)) throw new Error('Missing expected text: ' + oldText.slice(0, 120));
  text = text.replace(oldText, newText);
}

replaceOnce(
  'const scanVersion = "2026-06-09-architecture-v1";'+nl+
  'const crawlerVersion = "2026-06-09-crawler-v1";',
  'const scanVersion = "2026-09-04-rendered-crawl-v1";'+nl+
  'const crawlerVersion = "2026-09-04-rendered-crawl-v2";'
);

replaceOnce(
  '  discoveryNotes: string[];'+nl+'};'+nl+nl+'type AnalysisFinding = {',
  '  discoveryNotes: string[];'+nl+
  '  rendering: {'+nl+
  '    enabled: boolean;'+nl+
  '    pagesRendered: number;'+nl+
  '  };'+nl+
  '};'+nl+nl+
  'type RenderedPageResult = {'+nl+
  '  html: string;'+nl+
  '  status: number | null;'+nl+
  '  contentType: string | null;'+nl+
  '  finalUrl: string | null;'+nl+
  '};'+nl+nl+
  'type AnalysisFinding = {'
);

const fetchTextBlock =
  'async function fetchText(url: string, timeoutMs = requestTimeoutMs): Promise<{ ok: boolean; status: number; text: string; contentType: string | null }> {'+nl+
  '  const controller = new AbortController();'+nl+
  '  const timeout = setTimeout(() => controller.abort(), timeoutMs);'+nl+
  '  try {'+nl+
  '    const response = await fetch(url, {'+nl+
  '      signal: controller.signal,'+nl+
  '      headers: {'+nl+
  '        "User-Agent":'+nl+
  '          "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",'+nl+
  '        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",'+nl+
  '      },'+nl+
  '    });'+nl+
  '    const contentType = response.headers.get("content-type");'+nl+
  '    const text = await response.text();'+nl+
  '    return { ok: response.ok, status: response.status, text, contentType };'+nl+
  '  } finally {'+nl+
  '    clearTimeout(timeout);'+nl+
  '  }'+nl+
  '}'+nl+nl;

const renderHelpers =
  'async function fetchText(url: string, timeoutMs = requestTimeoutMs): Promise<{ ok: boolean; status: number; text: string; contentType: string | null }> {'+nl+
  '  const controller = new AbortController();'+nl+
  '  const timeout = setTimeout(() => controller.abort(), timeoutMs);'+nl+
  '  try {'+nl+
  '    const response = await fetch(url, {'+nl+
  '      signal: controller.signal,'+nl+
  '      headers: {'+nl+
  '        "User-Agent":'+nl+
  '          "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",'+nl+
  '        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",'+nl+
  '      },'+nl+
  '    });'+nl+
  '    const contentType = response.headers.get("content-type");'+nl+
  '    const text = await response.text();'+nl+
  '    return { ok: response.ok, status: response.status, text, contentType };'+nl+
  '  } finally {'+nl+
  '    clearTimeout(timeout);'+nl+
  '  }'+nl+
  '}'+nl+nl+
  'function getBrowserRenderEndpoint(): string | null {'+nl+
  '  const endpoint = Deno.env.get("BROWSER_RENDER_URL")?.trim();'+nl+
  '  return endpoint ? endpoint : null;'+nl+
  '}'+nl+nl+
  'function buildBrowserRenderUrl(endpoint: string, pageUrl: string): string {'+nl+
  '  if (endpoint.includes("{{url}}")) {'+nl+
  '    return endpoint.replaceAll("{{url}}", encodeURIComponent(pageUrl));'+nl+
  '  }'+nl+
  '  const separator = endpoint.includes("?") ? "&" : "?";'+nl+
  '  return `${endpoint}${separator}url=${encodeURIComponent(pageUrl)}`;'+nl+
  '}'+nl+nl+
  'function readRenderedHtml(payload: string, contentType: string | null): string {'+nl+
  '  if (!payload) return "";'+nl+
  '  if (contentType && !contentType.toLowerCase().includes("json")) return payload;'+nl+
  ''+nl+
  '  try {'+nl+
  '    const parsed = JSON.parse(payload);'+nl+
  '    if (typeof parsed === "string") return parsed.trim();'+nl+
  '    if (!parsed || typeof parsed !== "object") return "";'+nl+
  '    const record = parsed as Record<string, unknown>;'+nl+
  '    const candidates = ['+nl+
  '      record.html,'+nl+
  '      record.content,'+nl+
  '      record.body,'+nl+
  '      record.renderedHtml,'+nl+
  '      record.rendered_html,'+nl+
  '      record.sourceHtml,'+nl+
  '      record.source_html,'+nl+
  '      typeof record.data === "object" && record.data !== null ? (record.data as Record<string, unknown>).html : null,'+nl+
  '      typeof record.result === "object" && record.result !== null ? (record.result as Record<string, unknown>).html : null,'+nl+
  '    ];'+nl+
  '    for (const candidate of candidates) {'+nl+
  '      if (typeof candidate === "string" && candidate.trim()) return candidate;'+nl+
  '    }'+nl+
  '    return "";'+nl+
  '  } catch {'+nl+
  '    return payload;'+nl+
  '  }'+nl+
  '}'+nl+nl+
  'async function fetchRenderedPage(url: string, timeoutMs = 15000): Promise<RenderedPageResult | null> {'+nl+
  '  const endpoint = getBrowserRenderEndpoint();'+nl+
  '  if (!endpoint) return null;'+nl+
  ''+nl+
  '  const controller = new AbortController();'+nl+
  '  const timeout = setTimeout(() => controller.abort(), timeoutMs);'+nl+
  '  try {'+nl+
  '    const response = await fetch(buildBrowserRenderUrl(endpoint, url), {'+nl+
  '      signal: controller.signal,'+nl+
  '      headers: {'+nl+
  '        "User-Agent": "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",'+nl+
  '        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",'+nl+
  '      },'+nl+
  '    });'+nl+
  '    const contentType = response.headers.get("content-type");'+nl+
  '    const payload = await response.text();'+nl+
  '    if (!response.ok) {'+nl+
  '      return {'+nl+
  '        html: "",'+nl+
  '        status: response.status,'+nl+
  '        contentType,'+nl+
  '        finalUrl: null,'+nl+
  '      };'+nl+
  '    }'+nl+
  '    return {'+nl+
  '      html: readRenderedHtml(payload, contentType),'+nl+
  '      status: response.status,'+nl+
  '      contentType,'+nl+
  '      finalUrl: response.url ? response.url.replace(/\/$/, "") : null,'+nl+
  '    };'+nl+
  '  } catch {'+nl+
  '    return null;'+nl+
  '  } finally {'+nl+
  '    clearTimeout(timeout);'+nl+
  '  }'+nl+
  '}'+nl+nl;

replaceOnce(fetchTextBlock, renderHelpers);

// Add rendering state to crawlSite.
replaceOnce(
  '  const discoveryNotes: string[] = [];'+nl+'  const pageMap = new Map<string, PageSnapshot>();',
  '  const discoveryNotes: string[] = [];'+nl+
  '  const renderLayerEnabled = Boolean(getBrowserRenderEndpoint());'+nl+
  '  let renderedPages = 0;'+nl+
  '  const pageMap = new Map<string, PageSnapshot>();'
);

// Homepage render layer.
replaceOnce(
  '  const homepageHtml = homepageResult.text;'+nl,
  '  const homepageRendered = renderLayerEnabled ? await fetchRenderedPage(normalizedUrl) : null;'+nl+
  '  const homepageHtml = homepageRendered?.html?.trim() ? homepageRendered.html : homepageResult.text;'+nl
);

replaceOnce(
  '      rawMeta: {'+nl+
  '        contentType: homepageResult.contentType,'+nl+
  '        noindex: homepageNoindex,'+nl+
  '        noarchive: homepageNoarchive,'+nl+
  '      },',
  '      rawMeta: {'+nl+
  '        contentType: homepageResult.contentType,'+nl+
  '        noindex: homepageNoindex,'+nl+
  '        noarchive: homepageNoarchive,'+nl+
  '        rendering: {'+nl+
  '          enabled: renderLayerEnabled,'+nl+
  '          usedRenderedDom: Boolean(homepageRendered?.html),'+nl+
  '          statusCode: homepageRendered?.status ?? null,'+nl+
  '          contentType: homepageRendered?.contentType ?? null,'+nl+
  '          finalUrl: homepageRendered?.finalUrl ?? null,'+nl+
  '        },'+nl+
  '      },'
);

replaceOnce(
  '  homepage.pageScore = scorePage(homepage);'+nl+'  pageMap.set(homepage.url, homepage);',
  '  homepage.pageScore = scorePage(homepage);'+nl+
  '  pageMap.set(homepage.url, homepage);'+nl+
  '  if (homepageRendered?.html) {'+nl+
  '    renderedPages += 1;'+nl+
  '    if (homepageRendered.html !== homepageResult.text) {'+nl+
  '      discoveryNotes.push("Browser render layer captured the homepage DOM");'+nl+
  '    }'+nl+
  '  }'
);

// Candidate page render layer.
replaceOnce(
  '  for (const url of candidateUrls.slice(0, crawlLimit - 1)) {'+nl+
  '    const result = await fetchText(url, 10000);',
  '  for (const url of candidateUrls.slice(0, crawlLimit - 1)) {'+nl+
  '    const renderedPage = renderLayerEnabled ? await fetchRenderedPage(url) : null;'+nl+
  '    const result = await fetchText(url, 10000);'
);

replaceOnce(
  '    const html = result.text;'+nl,
  '    const html = renderedPage?.html?.trim() ? renderedPage.html : result.text;'+nl
);

replaceOnce(
  '      rawMeta: {'+nl+
  '        contentType: result.contentType,'+nl+
  '        noindex,'+nl+
  '        noarchive,'+nl+
  '      },',
  '      rawMeta: {'+nl+
  '        contentType: result.contentType,'+nl+
  '        noindex,'+nl+
  '        noarchive,'+nl+
  '        rendering: {'+nl+
  '          enabled: renderLayerEnabled,'+nl+
  '          usedRenderedDom: Boolean(renderedPage?.html),'+nl+
  '          statusCode: renderedPage?.status ?? null,'+nl+
  '          contentType: renderedPage?.contentType ?? null,'+nl+
  '          finalUrl: renderedPage?.finalUrl ?? null,'+nl+
  '        },'+nl+
  '      },'
);

replaceOnce(
  '    page.pageScore = scorePage(page);'+nl+'    pageMap.set(url, page);',
  '    page.pageScore = scorePage(page);'+nl+
  '    pageMap.set(url, page);'+nl+
  '    if (renderedPage?.html) renderedPages += 1;'
);

replaceOnce(
  '    discoveryNotes.push(`External profiles enriched: ${entityEnrichment.externalProfiles.length}`);'+nl+'  }'+nl+nl+'  return {',
  '    discoveryNotes.push(`External profiles enriched: ${entityEnrichment.externalProfiles.length}`);'+nl+
  '  }'+nl+
  '  if (renderedPages > 0) {'+nl+
  '    discoveryNotes.push(`Browser render layer applied to ${renderedPages} page(s)`);'+nl+
  '  }'+nl+nl+
  '  return {'
);

replaceOnce(
  '    discoveryNotes,',
  '    discoveryNotes,'+nl+
  '    rendering: {'+nl+
  '      enabled: renderedPages > 0,'+nl+
  '      pagesRendered: renderedPages,'+nl+
  '    },'
);

// Cached report query should only reuse reports with matching source versions.
replaceOnce(
  '.select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, ai_summary, recommendations, generated_at, websites!inner(normalized_url)")',
  '.select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, ai_summary, recommendations, generated_at, source_versions, websites!inner(normalized_url)")'
);

replaceOnce(
  '  if (cached && hasAllCategoryScores((cached as any).raw_scan_data)) {',
  '  if (cached && hasAllCategoryScores((cached as any).raw_scan_data) && isCurrentSourceVersion((cached as any).source_versions)) {'
);

replaceOnce(
  '      source_versions: { scan: scanVersion, crawler: crawlerVersion, psi: psiVersion },'+nl+'    };',
  '      source_versions: { scan: scanVersion, crawler: crawlerVersion, psi: psiVersion },'+nl+
  '    };'
);

replaceOnce(
  '      crawler: {'+nl+
  '      robotsTxt: discovery.robotsTxt,',
  '      crawler: {'+nl+
  '      robotsTxt: discovery.robotsTxt,'
);

replaceOnce(
  '        discoveryNotes: discovery.discoveryNotes,',
  '        discoveryNotes: discovery.discoveryNotes,'+nl+
  '        rendering: discovery.rendering,'
);

replaceOnce(
  '      crawler: crawlerVersion,',
  '      crawler: crawlerVersion,'+nl+
  '      rendering: discovery.rendering,'
);

replaceOnce(
  '      crawler: crawlerVersion,',
  '      crawler: crawlerVersion,'+nl+
  '      rendering: discovery.rendering,'
);

replaceOnce(
  '    discoveryNotes,',
  '    discoveryNotes,'+nl+
  '    rendering: discovery.rendering,'
);

replaceOnce(
  '  const unlocked = shouldUnlockFullReport && await consumePaidReportCredit(supabase, userId, String(report.id));',
  '  const unlocked = shouldUnlockFullReport && await consumePaidReportCredit(supabase, userId, String(report.id));'
);

// Add helper for cache version matching near hasAllCategoryScores.
replaceOnce(
  'function hasAllCategoryScores(rawScanData: any): boolean {'+nl+
  '  const categories = rawScanData?.lighthouseResult?.categories;'+nl+
  '  const keys = ["performance", "seo", "best-practices", "accessibility"];'+nl+
  '  return keys.every((key) => typeof categories?.[key]?.score === "number");'+nl+
  '}'+nl,
  'function hasAllCategoryScores(rawScanData: any): boolean {'+nl+
  '  const categories = rawScanData?.lighthouseResult?.categories;'+nl+
  '  const keys = ["performance", "seo", "best-practices", "accessibility"];'+nl+
  '  return keys.every((key) => typeof categories?.[key]?.score === "number");'+nl+
  '}'+nl+nl+
  'function isCurrentSourceVersion(sourceVersions: unknown): boolean {'+nl+
  '  if (!sourceVersions || typeof sourceVersions !== "object") return false;'+nl+
  '  const versions = sourceVersions as Record<string, unknown>;'+nl+
  '  return versions.scan === scanVersion && versions.crawler === crawlerVersion && versions.psi === psiVersion;'+nl+
  '}'
);

// Update raw_scan_data payloads to expose rendering metadata.
replaceOnce(
  '    rankio: {'+nl+
  '      vertical,',
  '    rankio: {'+nl+
  '      vertical,'+nl+
  '      rendering: discovery.rendering,'
);

replaceOnce(
  '    crawler: {'+nl+
  '      robotsTxt: discovery.robotsTxt,',
  '    crawler: {'+nl+
  '      robotsTxt: discovery.robotsTxt,'+nl+
  '      rendering: discovery.rendering,'
);

// Ensure cached block includes source versions and report payload keeps rendering in raw scan data.
replaceOnce(
  '      source_versions: { scan: scanVersion, crawler: crawlerVersion, psi: psiVersion },'+nl+
  '      source_versions: { scan: scanVersion, crawler: crawlerVersion, psi: psiVersion },'
);

fs.writeFileSync(path, text, 'utf8');
console.log('updated', path);
