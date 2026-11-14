const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { fork, execFileSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { readOnlyDatabaseUrl, summary, fingerprint } = require('./load-utils.cjs');

const root = path.resolve(__dirname, '../..');
const stageSeconds = Number(process.env.LEPERA_LOAD_SECONDS ?? 60);
assert.ok(Number.isInteger(stageSeconds) && stageSeconds >= 15 && stageSeconds <= 120, 'Stage duration must be 15–120 seconds');
const databaseUrl = readOnlyDatabaseUrl(process.env.LEPERA_LOAD_DATABASE_URL);
assert.ok(process.env.LEPERA_LOAD_PASSWORD, 'Provide only the synthetic seed password in LEPERA_LOAD_PASSWORD');
const output = path.join(root, 'work/load-read-results.json');
const { createPrismaClient } = require('../../packages/database/dist');
const db = createPrismaClient(databaseUrl);
const result = {
  startedAt: new Date().toISOString(),
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  workload: { virtualUsers: [10, 50, 200], stageSeconds, thinkTimeMs: 0, requestTimeoutMs: 10000, connection: 'loopback', readOnly: true },
  environment: { node: process.version, platform: process.platform, cpu: os.cpus()[0]?.model, logicalCpus: os.cpus().length, totalMemoryMiB: Math.round(os.totalmem() / 1048576) },
  stages: [], passed: false,
};
let child, api, peakDriverRss = process.memoryUsage().rss;
const samples = [];
let stderrLines = 0;
const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
const day = offset => dateFormat.format(new Date(Date.now() + offset * 86400000));
const routes = {
  calendar: `/appointments/calendar?from=${day(0)}&to=${day(7)}`,
  available: `/appointments/available-slots?from=${day(1)}&to=${day(8)}`,
  appointments: '/appointments/mine', requests: '/schedule-requests/mine',
  receptionList: '/appointments?scope=all&pageSize=20', pending: '/schedule-requests/pending',
  users: '/users', notices: '/notifications',
  report: `/reports?kind=appointments&from=${day(-30)}&to=${day(30)}`,
};
const accounts = [
  { email: 'lucas.paciente@email.com', role: 'PATIENT', routes: ['calendar', 'appointments', 'requests', 'available', 'notices', 'report'] },
  { email: 'beatriz.oliveira@email.com', role: 'PATIENT', routes: ['appointments', 'available', 'calendar', 'requests', 'report', 'notices'] },
  { email: 'rafael.santos@email.com', role: 'PATIENT', routes: ['requests', 'calendar', 'available', 'appointments', 'notices', 'report'] },
  { email: 'roberto.silva@leperapia.com', role: 'DOCTOR', routes: ['calendar', 'appointments', 'available', 'notices', 'report'] },
  { email: 'recepcao@leperapia.com', role: 'RECEPTIONIST', routes: ['calendar', 'pending', 'receptionList', 'available', 'report'] },
  { email: 'admin@leperapia.com', role: 'ADMIN', routes: ['users', 'calendar', 'receptionList', 'report'] },
];
// 50% patient, 20% psychologist, 20% reception and 10% administration.
const actors = [0, 1, 2, 0, 1, 3, 3, 4, 4, 5];

async function snapshot() {
  const tables = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`;
  const rows = [];
  for (const { table_name: table } of tables) {
    assert.match(table, /^[a-z_]+$/);
    // Only aggregate hashes leave PostgreSQL. No clinical content or credentials are exported.
    const [aggregate] = await db.$queryRawUnsafe(`SELECT count(*)::text AS count, md5(coalesce(string_agg(row_hash, '' ORDER BY row_hash), '')) AS digest FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM "${table}" t) s`);
    rows.push({ table, count: Number(aggregate.count), digest: aggregate.digest });
  }
  return { tables: Object.fromEntries(rows.map(row => [row.table, row.count])), contentDigest: fingerprint(rows) };
}

async function startApi() {
  child = fork(path.join(__dirname, 'load-api.cjs'), [], { cwd: root, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  child.stderr.on('data', bytes => { stderrLines += bytes.toString().split('\n').filter(Boolean).length; });
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('QA API did not start within 20 seconds')), 20000);
    const fail = () => { clearTimeout(timeout); reject(new Error('QA API failed to start; confirm the build and local database')); };
    child.once('error', fail);
    child.once('exit', fail);
    child.on('message', message => {
      if (message.type === 'sample') samples.push(message);
      if (message.type === 'startup-error') fail();
      if (message.type === 'ready') { clearTimeout(timeout); resolve(`http://127.0.0.1:${message.port}/api`); }
    });
  });
}

async function read(route, account) {
  return fetch(api + routes[route], { headers: { Authorization: 'Bearer ' + account.token }, redirect: 'error', signal: AbortSignal.timeout(10000) });
}

async function prepare() {
  for (const account of accounts) {
    const fixture = await db.user.findUnique({ where: { email: account.email }, select: { id: true, role: true, patient: { select: { id: true } }, doctor: { select: { id: true } } } });
    assert.equal(fixture?.role, account.role, 'Required synthetic account is missing');
    const response = await fetch(api + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password: process.env.LEPERA_LOAD_PASSWORD }), redirect: 'error', signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 201, 'Synthetic account login failed');
    const session = await response.json();
    assert.equal(session.user.id, fixture.id);
    assert.equal(session.user.role, account.role);
    account.token = session.accessToken;
    const where = fixture.patient ? { patientId: fixture.patient.id } : fixture.doctor ? { doctorId: fixture.doctor.id } : {};
    const allowedAppointments = new Set((await db.appointment.findMany({ where, select: { id: true } })).map(row => row.id));
    account.fingerprints = {};
    for (const route of account.routes) {
      const response = await read(route, account);
      assert.equal(response.status, 200, `Preflight failed: ${account.role}/${route}`);
      const body = await response.json();
      if (route === 'appointments' || route === 'calendar') {
        const items = route === 'appointments' ? body : body.items;
        assert.ok(items.every(item => allowedAppointments.has(item.id)), 'Consultation scope differs from the authenticated account');
      }
      account.fingerprints[route] = fingerprint(body, route === 'report');
    }
  }
  result.workload.accounts = accounts.length;
  result.workload.roleDistribution = { PATIENT: '50%', DOCTOR: '20%', RECEPTIONIST: '20%', ADMIN: '10%' };
  console.log('Preflight passed: six synthetic accounts, four roles, scoped responses and warm-up.');
}

function resources(from, to) {
  const selected = samples.filter(sample => sample.at >= from && sample.at <= to);
  if (selected.length < 2) return { samples: selected.length };
  return {
    samples: selected.length,
    apiPeakRssMiB: Number((Math.max(...selected.map(row => row.rss)) / 1048576).toFixed(1)),
    apiPeakHeapMiB: Number((Math.max(...selected.map(row => row.heapUsed)) / 1048576).toFixed(1)),
    apiCpuPercentOfOneCore: Number(((selected.at(-1).cpuMs - selected[0].cpuMs) / (selected.at(-1).at - selected[0].at) * 100).toFixed(1)),
  };
}

async function stage(users, seconds, name) {
  const records = [];
  const startedWall = Date.now(), started = performance.now(), deadline = started + seconds * 1000;
  let stopped = false;
  const progress = setInterval(() => {
    peakDriverRss = Math.max(peakDriverRss, process.memoryUsage().rss);
    console.log(`${name}: ${Math.round((performance.now() - started) / 1000)}s, ${records.length} responses`);
  }, 20000);
  console.log(`Starting ${name}: ${users} virtual users for ${seconds}s`);
  try {
    await Promise.all(Array.from({ length: users }, async (_, index) => {
      const account = accounts[actors[index % actors.length]];
      let turn = index;
      while (performance.now() < deadline && !stopped) {
        const route = account.routes[turn++ % account.routes.length];
        const start = performance.now();
        let status = 'networkError', payloadMismatch = false;
        try {
          const response = await read(route, account);
          status = response.status;
          if (response.status === 200) payloadMismatch = fingerprint(await response.json(), route === 'report') !== account.fingerprints[route];
          else await response.arrayBuffer();
        } catch (error) {
          status = error.name === 'TimeoutError' ? 'timeout' : 'networkError';
        }
        records.push({ route, role: account.role, status, payloadMismatch, elapsedMs: performance.now() - start });
        // Drain requests already in flight, then stop the stage and do not increase load.
        if (status !== 200 || payloadMismatch) stopped = true;
      }
    }));
  } finally { clearInterval(progress); }
  const elapsedMs = performance.now() - started;
  const outcome = {
    name, users, configuredSeconds: seconds, elapsedMs: Math.round(elapsedMs), stoppedEarly: stopped,
    ...summary(records, elapsedMs), resources: resources(startedWall, Date.now()),
    routes: Object.fromEntries([...new Set(records.map(row => `${row.role}/${row.route}`))].sort().map(key => [key, summary(records.filter(row => `${row.role}/${row.route}` === key), elapsedMs)])),
  };
  result.stages.push(outcome);
  console.log(JSON.stringify({ stage: name, requests: outcome.requests, p95Ms: outcome.p95Ms, status: outcome.status, payloadMismatches: outcome.payloadMismatches }));
  assert.equal(stopped, false, 'Load stage stopped after a failed request or unexpected response; see aggregate results');
}

async function main() {
  const [config] = await db.$queryRaw`SELECT current_database() AS database, current_setting('default_transaction_read_only') AS readonly, current_setting('server_version') AS postgres, current_setting('max_connections') AS max_connections, current_setting('shared_buffers') AS shared_buffers`;
  assert.equal(config.readonly, 'on');
  result.database = config;
  result.before = await snapshot();
  api = await startApi();
  await prepare();
  const baseline = Date.now();
  await delay(5000);
  result.baseline = resources(baseline, Date.now());
  for (const users of [10, 50, 200]) {
    await stage(users, stageSeconds, `${users} VUs`);
    await delay(3000);
  }
  await stage(10, 10, 'recovery');
  result.after = await snapshot();
  assert.deepEqual(result.after, result.before, 'Database content changed during read-only load');
  const health = await fetch(api + '/health', { signal: AbortSignal.timeout(10000), redirect: 'error' });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).status, 'ok');
  result.passed = true;
  console.log('PASS all stages, response consistency, account scopes, recovery and database fingerprints.');
}

main().catch(error => {
  result.failure = error.code ?? error.name ?? 'ValidationError';
  console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Load validation failed; verify local QA prerequisites.');
  process.exitCode = 1;
}).finally(async () => {
  if (!result.after && result.before) result.after = await snapshot().catch(() => null);
  if (child?.connected) {
    child.send('stop');
    await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(5000)]);
    if (child.exitCode === null) child.kill();
  } else if (child && child.exitCode === null) child.kill();
  await db.$disconnect();
  result.finishedAt = new Date().toISOString();
  result.driverPeakRssMiB = Math.round(Math.max(peakDriverRss, process.memoryUsage().rss) / 1048576);
  result.apiStderrLines = stderrLines;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log('Aggregate results saved under work/load-read-results.json (ignored by Git).');
});
