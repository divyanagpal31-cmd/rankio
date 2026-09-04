const fs = require('fs');
const path = 'supabase/functions/scan/index.ts';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

function findLineIndex(substr, start = 0) {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].includes(substr)) return i;
  }
  return -1;
}

function insertAfter(substr, newLines, start = 0) {
  const idx = findLineIndex(substr, start);
  if (idx < 0) throw new Error('Missing line containing: ' + substr);
  lines.splice(idx + 1, 0, ...newLines);
  return idx + 1;
}

function insertBefore(substr, newLines, start = 0) {
  const idx = findLineIndex(substr, start);
  if (idx < 0) throw new Error('Missing line containing: ' + substr);
  lines.splice(idx, 0, ...newLines);
  return idx;
}

function replaceLine(substr, newLines, start = 0) {
  const idx = findLineIndex(substr, start);
  if (idx < 0) throw new Error('Missing line containing: ' + substr);
  lines.splice(idx, 1, ...newLines);
  return idx;
}

replaceLine('const scanVersion = "2026-06-09-architecture-v1";', ['const scanVersion = "2026-09-04-rendered-crawl-v1";']);
replaceLine('const crawlerVersion = "2026-06-09-crawler-v1";', ['const crawlerVersion = "2026-09-04-rendered-crawl-v2";']);

replaceLine('  discoveryNotes: string[];', [
  '  discoveryNotes: string[];',
  '  rendering: {',
  '    enabled: boolean;',
  '    pagesRendered: number;',
  '  };',
]);

insertBefore('type AnalysisFinding = {', [
  '',
  'type RenderedPageResult = {',
  '  html: string;',
  '  status: number | null;',
  '  contentType: string | null;',
  '  finalUrl: string | null;',
  '};',
]);

insertBefore('async function fetchStatus(url: string, timeoutMs = 6000): Promise<{ status: number | null; ok: boolean }> {', [
  '',
  'function getBrowserRenderEndpoint(): string | null {',
  '  const endpoint = Deno.env.get("BROWSER_RENDER_URL")?.trim();',
  '  return endpoint ? endpoint : null;',
  '}',
  '',
  'function buildBrowserRenderUrl(endpoint: string, pageUrl: string): string {',
  '  if (endpoint.includes("{{url}}")) {',
  '    return endpoint.replaceAll("{{url}}", encodeURIComponent(pageUrl));',
  '  }',
  '  const separator = endpoint.includes("?") ? "&" : "?";',
  '  return `${endpoint}${separator}url=${encodeURIComponent(pageUrl)}`;',
  '}',
  '',
  'function readRenderedHtml(payload: string, contentType: string | null): string {',
  '  if (!payload) return "";',
  '  if (contentType && !contentType.toLowerCase().includes("json")) return payload;',
  '',
  '  try {',
  '    const parsed = JSON.parse(payload);',
  '    if (typeof parsed === "string") return parsed.trim();',
  '    if (!parsed || typeof parsed !== "object") return "";',
  '    const record = parsed as Record<string, unknown>;',
  '    const candidates = [',
  '      record.html,',
  '      record.content,',
  '      record.body,',
  '      record.renderedHtml,',
  '      record.rendered_html,',
  '      record.sourceHtml,',
  '      record.source_html,',
  '      typeof record.data === "object" && record.data !== null ? (record.data as Record<string, unknown>).html : null,',
  '      typeof record.result === "object" && record.result !== null ? (record.result as Record<string, unknown>).html : null,',
  '    ];',
  '    for (const candidate of candidates) {',
  '      if (typeof candidate === "string" && candidate.trim()) return candidate;',
  '    }',
  '    return "";',
  '  } catch {',
  '    return payload;',
  '  }',
  '}',
  '',
  'async function fetchRenderedPage(url: string, timeoutMs = 15000): Promise<RenderedPageResult | null> {',
  '  const endpoint = getBrowserRenderEndpoint();',
  '  if (!endpoint) return null;',
  '',
  '  const controller = new AbortController();',
  '  const timeout = setTimeout(() => controller.abort(), timeoutMs);',
  '  try {',
  '    const response = await fetch(buildBrowserRenderUrl(endpoint, url), {',
  '      signal: controller.signal,',
  '      headers: {',
  '        "User-Agent": "RankioBot/1.0 (+https://rankio.ai) Mozilla/5.0",',
  '        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",',
  '      },',
  '    });',
  '    const contentType = response.headers.get("content-type");',
  '    const payload = await response.text();',
  '    if (!response.ok) {',
  '      return {',
  '        html: "",',
  '        status: response.status,',
  '        contentType,',
  '        finalUrl: null,',
  '      };',
  '    }',
  '    return {',
  '      html: readRenderedHtml(payload, contentType),',
  '      status: response.status,',
  '      contentType,',
  '      finalUrl: response.url ? response.url.replace(/\/$/, "") : null,',
  '    };',
  '  } catch {',
  '    return null;',
  '  } finally {',
  '    clearTimeout(timeout);',
  '  }',
  '}',
]);

insertAfter('  const discoveryNotes: string[] = [];', [
  '  const renderLayerEnabled = Boolean(getBrowserRenderEndpoint());',
  '  let renderedPages = 0;',
]);

replaceLine('  const homepageHtml = homepageResult.text;', [
  '  const homepageRendered = renderLayerEnabled ? await fetchRenderedPage(normalizedUrl) : null;',
  '  const homepageHtml = homepageRendered?.html?.trim() ? homepageRendered.html : homepageResult.text;',
]);

insertAfter('  homepage.pageScore = scorePage(homepage);', [
  '  if (homepageRendered?.html) {',
  '    renderedPages += 1;',
  '  }',
]);

replaceLine('  for (const url of candidateUrls.slice(0, crawlLimit - 1)) {', [
  '  for (const url of candidateUrls.slice(0, crawlLimit - 1)) {',
  '    const renderedPage = renderLayerEnabled ? await fetchRenderedPage(url) : null;',
]);

replaceLine('    const html = result.text;', ['    const html = renderedPage?.html?.trim() ? renderedPage.html : result.text;']);

insertAfter('    pageMap.set(url, page);', [
  '    if (renderedPage?.html) renderedPages += 1;',
]);

insertAfter('  if (entityEnrichment.externalProfiles.length > 0) discoveryNotes.push(`External profiles enriched: ${entityEnrichment.externalProfiles.length}`);', [
  '  if (renderedPages > 0) {',
  '    discoveryNotes.push(`Browser render layer applied to ${renderedPages} page(s)`);',
  '  }',
]);

insertAfter('  return {', [
  '    rendering: {',
  '      enabled: renderedPages > 0,',
  '      pagesRendered: renderedPages,',
  '    },',
]);

insertBefore('function buildAnalysisFindings(', [
  '',
  'function isCurrentSourceVersion(sourceVersions: unknown): boolean {',
  '  if (!sourceVersions || typeof sourceVersions !== "object") return false;',
  '  const versions = sourceVersions as Record<string, unknown>;',
  '  return versions.scan === scanVersion && versions.crawler === crawlerVersion && versions.psi === psiVersion;',
  '}',
]);

replaceLine('.select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, ai_summary, recommendations, generated_at, websites!inner(normalized_url)")', [
  '.select("id, website_id, status, ai_score, performance_score, seo_score, technical_score, raw_scan_data, ai_summary, recommendations, generated_at, source_versions, websites!inner(normalized_url)")',
]);

replaceLine('  if (cached && hasAllCategoryScores((cached as any).raw_scan_data)) {', [
  '  if (cached && hasAllCategoryScores((cached as any).raw_scan_data) && isCurrentSourceVersion((cached as any).source_versions)) {',
]);

insertAfter('      psi_error: psiFailureMessage,', [
  '      rendering: discovery.rendering,',
]);

insertAfter('      discoveryNotes: discovery.discoveryNotes,', [
  '      rendering: discovery.rendering,',
]);

fs.writeFileSync(path, lines.join('\r\n'), 'utf8');
console.log(`updated ${path}`);
