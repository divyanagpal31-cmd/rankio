import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
const { outputFiles } = buildSync({ entryPoints: ['src/app/services/audit-tile-tone.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { auditTone: tone, highestAuditSeverity: highest } = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

test('high and critical issues are red; medium is amber; low is informational blue', () => {
  assert.equal(tone({ severity: 'Critical' }), 'rose');
  assert.equal(tone({ severity: 'High' }), 'rose');
  assert.equal(tone({ severity: 'Medium' }), 'amber');
  assert.equal(tone({ severity: 'Low' }), 'sky');
});
test('positive checks are green and informational results are blue', () => {
  assert.equal(tone({ positive: true }), 'emerald');
  assert.equal(tone({}), 'sky');
});
test('unavailable evidence cannot be colored as success or failure', () => {
  assert.equal(tone({ available: false, positive: true, score: 100 }), 'sky');
  assert.equal(tone({ available: false, severity: 'High', score: 0 }), 'sky');
});
test('metric bands color 75 percent amber, low scores red, and good scores green', () => {
  assert.equal(tone({ score: 75 }), 'amber');
  assert.equal(tone({ score: 49 }), 'rose');
  assert.equal(tone({ score: 80 }), 'emerald');
  assert.equal(tone({ score: 100 }), 'emerald');
  assert.equal(tone({ score: NaN }), 'sky');
});
test('real issue severity takes precedence over a numeric metric', () => {
  assert.equal(tone({ score: 95, severity: 'High' }), 'rose');
  assert.equal(tone({ score: 95, severity: 'Medium' }), 'amber');
  assert.equal(highest(['low', 'high', 'medium']), 'high');
  assert.equal(highest(['High', 'Critical']), 'Critical');
  assert.equal(highest([]), undefined);
});