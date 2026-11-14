const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');

function readOnlyDatabaseUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Set LEPERA_LOAD_DATABASE_URL to the isolated local QA database.'); }
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'PostgreSQL is required');
  assert.equal(url.hostname, '127.0.0.1', 'Load tests only accept PostgreSQL on 127.0.0.1');
  assert.match(url.pathname, /^\/lepera_(?:[a-z0-9]+_)*qa$/, 'Use a dedicated lepera_*_qa database');
  for (const key of url.searchParams.keys()) {
    assert.ok(['schema', 'sslmode'].includes(key), 'Connection overrides are not allowed');
  }
  url.search = '';
  url.searchParams.set('schema', 'public');
  url.searchParams.set('sslmode', 'disable');
  url.searchParams.set('options', '-c default_transaction_read_only=on -c statement_timeout=8000');
  return url.toString();
}

function summary(records, elapsedMs) {
  const sorted = records.map(row => row.elapsedMs).sort((a, b) => a - b);
  const percentile = fraction => sorted.length ? Number(sorted[Math.ceil(fraction * sorted.length) - 1].toFixed(1)) : null;
  return {
    requests: records.length,
    throughputPerSecond: Number((records.length / (elapsedMs / 1000)).toFixed(1)),
    p50Ms: percentile(0.5), p95Ms: percentile(0.95), p99Ms: percentile(0.99),
    status: records.reduce((counts, row) => { counts[row.status] = (counts[row.status] ?? 0) + 1; return counts; }, {}),
    payloadMismatches: records.filter(row => row.payloadMismatch).length,
  };
}

function fingerprint(value, omitGeneratedAt = false) {
  const stable = item => {
    if (Array.isArray(item)) return item.map(stable);
    if (item && typeof item === 'object') return Object.fromEntries(Object.keys(item).sort().map(key => [key, stable(item[key])]));
    return item;
  };
  const copy = { ...value };
  if (omitGeneratedAt) delete copy.generatedAt;
  return createHash('sha256').update(JSON.stringify(stable(omitGeneratedAt ? copy : value))).digest('hex');
}

module.exports = { readOnlyDatabaseUrl, summary, fingerprint };
