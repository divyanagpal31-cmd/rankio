import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';

const { outputFiles } = buildSync({ entryPoints: ['supabase/functions/_shared/content-scoring.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { calculateContentScore: score, correctReportContentScore: correct } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const good = { title: 'Product details', metaDescription: 'Useful description', h1Count: 1, h2Count: 2, wordCount: 800, pageScore: 100 };

test('complete observed signals earn 100; no crawl evidence earns no score', () => {
  assert.equal(score([good]).score, 100);
  assert.equal(score([]), null);
});
test('missing metadata cannot be outweighed by words or headings', () => {
  const missing = { ...good, title: '', metaDescription: ' ', h2Count: 1000, wordCount: 100000 };
  assert.equal(score([missing]).score, 60);
  assert.equal(score(Array(12).fill(missing)).score, 60);
});
test('duplicate crawled evidence does not improve content score', () => {
  const pages = [good, { ...good, metaDescription: '', h1Count: 0, pageScore: 72, wordCount: 200 }];
  assert.equal(score(pages).score, score([...pages, ...pages, ...pages]).score);
});
test('multiple H1s earn no heading credit, extra H2s are bounded', () => {
  assert.equal(score([{ ...good, h1Count: 6, h2Count: 100 }]).score, 75);
  assert.equal(score([{ ...good, h2Count: 100 }]).score, 100);
  assert.equal(score([{ ...good, h1Count: 0 }]).score, 75);
});
test('page quality and thin content reduce the result', () => {
  assert.equal(score([{ ...good, pageScore: 72 }]).score, 96);
  assert.equal(score([{ ...good, wordCount: 0 }]).score, 80);
  assert.ok(score([{ ...good, pageScore: 99 }]).score < 100);
});
test('legacy reports update content, overall, and summaries without mutation', () => {
  const report = { ai_score: 90, ai_summary: 'AI visibility score 90/100 based on signals.', score_breakdown: { technical_visibility: 80, content_visibility: 100, ai_understanding: 80, citation_visibility: 80, overall_score: 90 }, raw_scan_data: { crawler: { pages: [{ ...good, metaDescription: '' }] } } };
  const updated = correct(report);
  assert.equal(updated.score_breakdown.content_visibility, 80);
  assert.equal(updated.ai_score, 85);
  assert.match(updated.ai_summary, /score 85\/100/);
  assert.equal(report.ai_score, 90);
  assert.deepEqual(correct(updated), updated);
});
test('camelCase stored breakdowns and preview payloads are corrected together', () => {
  const report = { ai_score: 85, raw_scan_data: { crawler: { pages: [{ ...good, metaDescription: '' }] }, preview_payload: { summary: 'AI visibility score 85/100', score_breakdown: { technicalVisibility: 80, contentVisibility: 100, aiUnderstanding: 80, citationVisibility: 80, overallScore: 85 } } } };
  const updated = correct(report);
  assert.equal(updated.ai_score, 80);
  assert.equal(updated.raw_scan_data.preview_payload.score_breakdown.contentVisibility, 80);
  assert.match(updated.raw_scan_data.preview_payload.summary, /score 80\/100/);
});
test('incomplete breakdowns do not invent overall scores; unavailable crawls remain unchanged', () => {
  const partial = { ai_score: 65, raw_scan_data: { crawler: { pages: [good] } } };
  assert.equal(correct(partial).ai_score, 65);
  const unavailable = { ai_score: 100, raw_scan_data: {} };
  assert.equal(correct(unavailable), unavailable);
});
test('saved capped overall scores preserve their actual industry adjustment', () => {
  const report = { ai_score: 100, score_breakdown: { technical_visibility: 95, content_visibility: 100, ai_understanding: 95, citation_visibility: 90, overall_score: 100 }, raw_scan_data: { rankio: { vertical: 'ecommerce' }, crawler: { pages: Array(5).fill({ ...good, metaDescription: '', schemaTypes: ['Product'] }) } } };
  assert.equal(correct(report).ai_score, 100);
  const reduced = { ...report, raw_scan_data: { ...report.raw_scan_data, crawler: { pages: Array(5).fill({ ...good, title: '', metaDescription: '', schemaTypes: ['Product'] }) } } };
  assert.equal(correct(reduced).ai_score, 95);
});
test('lightweight dashboard page evidence receives the same correction', () => {
  const report = { ai_score: 85, scoring_pages: [{ ...good, metaDescription: '' }], scoring_breakdown: { technicalVisibility: 80, contentVisibility: 100, aiUnderstanding: 80, citationVisibility: 80, overallScore: 85 } };
  assert.equal(correct(report).ai_score, 80);
});