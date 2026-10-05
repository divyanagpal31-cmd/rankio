import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const { outputFiles } = buildSync({ entryPoints: ['supabase/functions/_shared/structured-scoring.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { calculateDetailsScore: score, collectSchemaTypes: types, pageSchemaTypes, businessDetailsMatch: match } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);
const valid = { itemCount: 1, validItemCount: 1, syntaxErrorCount: 0, errorCount: 0, warningCount: 0, items: [{ type: 'Organization', valid: true }] };
const page = { schemaTypes: ['Organization'], schemaValidation: valid };
const field = { values: ['same'], pageCount: 2, consistent: true };

test('missing structured data scores zero; no crawl evidence has no score', () => {
  assert.equal(score([{ schemaTypes: [], schemaValidation: { itemCount: 0, validItemCount: 0 } }]).score, 0);
  assert.equal(score([]), null);
});
test('coverage, validity, and recognized types produce the score independently of SEO', () => {
  assert.equal(score([page]).score, 100);
  assert.equal(score([{ schemaTypes: [], seoScore: 100, technicalVisibility: 100 }]).score, 0);
  assert.equal(score([page, { schemaTypes: [] }]).score, 50);
  assert.equal(score([page, { schemaTypes: [] }, page, { schemaTypes: [] }]).score, 50);
});
test('schema errors and warnings prevent a perfect result', () => {
  const invalid = { ...page, schemaValidation: { ...valid, validItemCount: 0, errorCount: 1 } };
  assert.equal(score([invalid]).score, 70);
  assert.equal(score([{ ...page, schemaValidation: { ...valid, warningCount: 1 } }]).score, 97);
  assert.ok(score([{ ...page, schemaValidation: { ...valid, syntaxErrorCount: 1, errorCount: 1 } }]).score < 100);
});
test('syntax-only failures do not claim clear or present schema', () => {
  const result = score([{ schemaTypes: [], schemaValidation: { itemCount: 0, validItemCount: 0, syntaxErrorCount: 1, errorCount: 1 } }]);
  assert.equal(result.score, 0);
  assert.equal(result.errorCount, 1);
  assert.equal(result.pagesWithSchema, 0);
});
test('missing validation evidence gets no validation bonus', () => {
  const result = score([{ schemaTypes: ['Organization'] }]);
  assert.equal(result.score, 70);
  assert.equal(result.validationAvailable, false);
});
test('JSON-LD graph and array roots expose all declared types', () => {
  assert.deepEqual(types({ '@graph': [{ '@type': 'Organization' }, { '@type': ['WebSite', 'WebPage'] }] }), ['Organization', 'WebSite', 'WebPage']);
  assert.deepEqual(types([{ '@type': 'Product' }, { '@graph': [{ '@type': 'FAQPage' }] }]), ['Product', 'FAQPage']);
  assert.deepEqual(types(null), []);
});
test('saved validator evidence repairs old graph-extraction gaps', () => {
  const legacy = { schemaTypes: [], schemaValidation: valid };
  assert.deepEqual(pageSchemaTypes(legacy), ['Organization']);
  assert.equal(score([legacy]).score, 100);
});
test('business consistency requires all three fields to match across at least two pages', () => {
  assert.equal(match({ detected: true }).value, 'Not enough data');
  assert.equal(match({ detected: false }).value, 'Not detected');
  assert.equal(match({ detected: true, fields: { businessName: { ...field, pageCount: 1 } } }).value, 'Not enough data');
  assert.equal(match({ detected: true, fields: { businessName: field } }).value, 'Partial match');
  assert.equal(match({ detected: true, fields: { businessName: field, address: field, phone: field } }).value, 'Consistent');
  assert.equal(match({ detected: true, fields: { businessName: { ...field, values: ['a', 'b'] } } }).value, 'Needs review');
});