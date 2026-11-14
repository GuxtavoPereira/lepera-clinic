const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readOnlyDatabaseUrl, summary, fingerprint } = require('./load-utils.cjs');

test('rejects remote, production and host override targets before connecting', () => {
  for (const target of [undefined, 'https://127.0.0.1/lepera_native_qa', 'postgres://u:p@db.example.com/lepera_native_qa', 'postgres://u:p@127.0.0.1/production', 'postgres://u:p@127.0.0.1/lepera_native_qa?host=remote', 'postgres://u:p@127.0.0.1/lepera_native_qa?options=-c%20default_transaction_read_only=off']) {
    assert.throws(() => readOnlyDatabaseUrl(target));
  }
});
test('enforces read-only transactions and a statement timeout on the local QA database', () => {
  const url = new URL(readOnlyDatabaseUrl('postgresql://u:p@127.0.0.1:51235/lepera_native_qa?schema=public'));
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '51235');
  assert.equal(url.searchParams.get('options'), '-c default_transaction_read_only=on -c statement_timeout=8000');
});
test('percentiles, HTTP failures and body mismatches are reported independently', () => {
  const result = summary(Array.from({ length: 100 }, (_, i) => ({ elapsedMs: i + 1, status: i === 99 ? 'timeout' : 200, payloadMismatch: i === 1 })), 2000);
  assert.deepEqual([result.p50Ms, result.p95Ms, result.p99Ms], [50, 95, 99]);
  assert.equal(result.throughputPerSecond, 50);
  assert.equal(result.status.timeout, 1);
  assert.equal(result.payloadMismatches, 1);
  assert.equal(summary([], 1000).p95Ms, null);
});
test('body validation ignores report generation time but detects changes to content and array order', () => {
  assert.equal(fingerprint({ a: 1, b: 2 }), fingerprint({ b: 2, a: 1 }));
  assert.equal(fingerprint({ rows: [1], generatedAt: 'one' }, true), fingerprint({ generatedAt: 'two', rows: [1] }, true));
  assert.notEqual(fingerprint({ rows: [1, 2] }), fingerprint({ rows: [2, 1] }));
  assert.notEqual(fingerprint({ rows: [1] }, true), fingerprint({ rows: [2] }, true));
});
