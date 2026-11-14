// HTTP authorization checks against an existing synthetic database on loopback only.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const { randomBytes, randomUUID } = require('node:crypto');
const { readOnlyDatabaseUrl, fingerprint } = require('./load-utils.cjs');
const root = path.resolve(__dirname, '../..');
const database = new URL(readOnlyDatabaseUrl(process.env.LEPERA_SECURITY_DATABASE_URL));
// Authorized clinical reads write audit entries; two temporary notifications are also tested.
database.searchParams.set('options', '-c statement_timeout=8000');
assert.match(process.env.LEPERA_SECURITY_ENCRYPTION_KEY ?? '', /^[a-f0-9]{64}$/i, 'Provide the key of the synthetic QA database');
assert.ok(process.env.LEPERA_SECURITY_PASSWORD, 'Provide the synthetic seed password');
const secret = randomBytes(32).toString('hex');
Object.assign(process.env, {
  NODE_ENV: 'test', PORT: '3333', DATABASE_URL: database.toString(),
  ENCRYPTION_KEY: process.env.LEPERA_SECURITY_ENCRYPTION_KEY, JWT_SECRET: secret,
  WEB_URL: 'http://localhost:3000', GOOGLE_CLIENT_ID: 'qa-client.apps.googleusercontent.com',
  SMTP_HOST: '', SMTP_PORT: '465', SMTP_USER: '', SMTP_PASSWORD: '', SMTP_FROM: '', TRUST_PROXY: '0',
});
const requireApi = createRequire(path.join(root, 'apps/api/package.json'));
const { NestFactory } = requireApi('@nestjs/core');
const { ValidationPipe } = requireApi('@nestjs/common');
const { JwtService } = requireApi('@nestjs/jwt');
const { AppModule } = requireApi('./dist/app.module.js');
const { createPrismaClient } = require('../../packages/database/dist');
const db = createPrismaClient(database.toString());
const jwt = new JwtService({ secret });
const result = { startedAt: new Date().toISOString(), groups: [], requestsChecked: 0, missingNoStore: [], passed: false };
const accounts = {
  patientA: { email: 'lucas.paciente@email.com', role: 'PATIENT' },
  patientB: { email: 'beatriz.oliveira@email.com', role: 'PATIENT' },
  doctorA: { email: 'roberto.silva@leperapia.com', role: 'DOCTOR' },
  doctorB: { email: 'camila.almeida@leperapia.com', role: 'DOCTOR' },
  reception: { email: 'recepcao@leperapia.com', role: 'RECEPTIONIST' },
  admin: { email: 'admin@leperapia.com', role: 'ADMIN' },
  superAdmin: { email: 'super@leperapia.com', role: 'SUPER_ADMIN' },
};
let app, api, before, checkedData;
const notifications = [];
const pass = label => { result.groups.push(label); console.log('PASS ' + label); };
async function request(route, actor, status = 200, method = 'GET', body, token) {
  const credential = token ?? accounts[actor]?.token;
  const response = await fetch(api + route, {
    method, headers: { ...(credential ? { Authorization: 'Bearer ' + credential } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, status, `${method} ${route.split('?')[0].replace(/[a-f0-9-]{36}/g, ':id')} / ${actor ?? 'anonymous'}`);
  const data = await response.json();
  result.requestsChecked++;
  if (status >= 400) assert.ok(!data.record && !data.patient && !data.items, 'Rejected response must not include protected records');
  return { response, data };
}
function noStore(response, label) {
  if (!/\bprivate\b/.test(response.headers.get('cache-control') ?? '') || !/\bno-store\b/.test(response.headers.get('cache-control') ?? '')) result.missingNoStore.push(label);
}
async function clinicalSnapshot() {
  return fingerprint({ records: await db.clinicalRecord.findMany({ orderBy: { id: 'asc' } }), appointments: await db.appointment.findMany({ orderBy: { id: 'asc' } }) });
}
function limitedKeys(rows, keys) {
  for (const row of rows) assert.deepEqual(Object.keys(row).sort(), [...keys].sort(), 'Public/minimal response expanded unexpectedly');
}
async function main() {
  before = await clinicalSnapshot();
  app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  api = `http://127.0.0.1:${app.getHttpServer().address().port}/api`;
  for (const [key, account] of Object.entries(accounts)) {
    account.fixture = await db.user.findUniqueOrThrow({ where: { email: account.email }, select: { id: true, name: true, sessionVersion: true, patient: { select: { id: true } }, doctor: { select: { id: true } } } });
    const { data } = await request('/auth/login', undefined, 201, 'POST', { email: account.email, password: process.env.LEPERA_SECURITY_PASSWORD });
    assert.equal(data.user.id, account.fixture.id);
    assert.equal(data.user.role, account.role);
    accounts[key].token = data.accessToken;
  }
  const record = await db.clinicalRecord.findFirstOrThrow({ where: { doctorId: accounts.doctorA.fixture.doctor.id } });
  const recordRoute = '/clinical-records/by-appointment/' + record.appointmentId;
  const auditWhere = { resourceId: record.id, action: 'clinical_record.read', actorId: accounts.doctorA.fixture.id };
  const auditBefore = await db.auditLog.count({ where: auditWhere });
  const own = await request(recordRoute, 'doctorA');
  assert.equal(own.data.record.id, record.id);
  noStore(own.response, 'clinical record detail');
  assert.equal(await db.auditLog.count({ where: auditWhere }), auditBefore + 1);
  const metadata = await request('/clinical-records/mine', 'doctorA');
  noStore(metadata.response, 'clinical record list');
  assert.ok(metadata.data.length > 0);
  for (const item of metadata.data) assert.ok(!('mainComplaint' in item) && !('clinicalNotes' in item) && !('diagnosticHypothesis' in item));
  for (const actor of [undefined, 'patientA', 'patientB', 'reception', 'admin', 'superAdmin', 'doctorB']) {
    const expected = !actor ? 401 : actor === 'doctorB' ? 404 : 403;
    await request(recordRoute, actor, expected);
    await request(recordRoute, actor, expected, 'PUT', {});
    await request(recordRoute + '/sign', actor, expected, 'POST', {});
    if (actor !== 'doctorB') await request('/clinical-records/mine', actor, expected);
  }
  pass('Clinical records: authorized reading is audited; other roles and unrelated psychologist cannot read, edit or sign');

  const patient = await db.patient.findFirstOrThrow({ where: { appointments: { some: { doctorId: accounts.doctorA.fixture.doctor.id }, none: { doctorId: accounts.doctorB.fixture.doctor.id } } } });
  const summary = await request('/patients/mine/' + patient.id, 'doctorA');
  noStore(summary.response, 'minimal patient summary');
  limitedKeys([summary.data.user], ['name', 'email', 'age']);
  await request('/patients/mine/' + patient.id, 'doctorB', 404);
  for (const actor of ['patientA', 'patientB', 'reception', 'admin', 'superAdmin']) await request('/patients/mine/' + patient.id, actor, 403);
  for (const actor of ['patientA', 'patientB', 'doctorA', 'doctorB']) {
    await request('/patients/' + patient.id, actor, 403);
    await request('/patients/' + patient.id, actor, 403, 'PATCH', {});
  }
  pass('Patient summaries require a clinical relationship; administrative patient routes cannot bypass it');

  const from = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  const to = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  for (const actor of ['patientA', 'patientB', 'doctorA', 'doctorB']) {
    const fixture = accounts[actor].fixture;
    const where = fixture.patient ? { patientId: fixture.patient.id } : { doctorId: fixture.doctor.id };
    const ids = (await db.appointment.findMany({ where, select: { id: true } })).map(row => row.id).sort();
    const mine = await request('/appointments/mine', actor);
    assert.deepEqual(mine.data.map(row => row.id).sort(), ids);
    const report = await request(`/reports?kind=appointments&from=${from}&to=${to}`, actor);
    noStore(report.response, 'own appointment report');
    const column = report.data.columns.indexOf(fixture.patient ? 'Paciente' : 'Profissional');
    assert.ok(column >= 0 && report.data.rows.length > 0);
    assert.ok(report.data.rows.every(row => row[column] === fixture.name));
    await request(`/reports?kind=audit&from=${from}&to=${to}`, actor, 403);
    await request(`/reports?kind=financial&from=${from}&to=${to}`, actor, 403);
    await request('/appointments/' + record.appointmentId, actor, 403);
  }
  pass('Private appointment lists and reports match their owner; administrative reports and detail routes remain restricted');

  for (const actor of ['patientA', 'patientB']) {
    const item = await db.notification.create({ data: { userId: accounts[actor].fixture.id, type: 'qa_permission', title: 'Teste sintético', message: 'Notificação temporária de QA ' + randomUUID() } });
    notifications.push(item.id);
  }
  const notices = await request('/notifications', 'patientA');
  noStore(notices.response, 'notification list');
  assert.ok(notices.data.some(item => item.id === notifications[0]));
  assert.ok(notices.data.every(item => item.id !== notifications[1]));
  for (const actor of ['patientA', 'doctorA', 'reception', 'admin', 'superAdmin']) await request('/notifications/' + notifications[1] + '/read', actor, 404, 'PATCH', {});
  assert.equal((await db.notification.findUniqueOrThrow({ where: { id: notifications[1] } })).isRead, false);
  await request('/notifications/' + notifications[0] + '/read', 'patientA', 200, 'PATCH', {});
  pass('Notifications remain private even to administrators; only the owner can mark a notification as read');

  const fixture = accounts.patientA.fixture;
  const payload = { sub: fixture.id, role: 'PATIENT', sessionVersion: fixture.sessionVersion };
  await request('/users', undefined, 403, 'GET', undefined, jwt.sign({ ...payload, role: 'SUPER_ADMIN' }));
  await request('/profile/me', undefined, 401, 'GET', undefined, jwt.sign({ ...payload, sessionVersion: fixture.sessionVersion + 1 }));
  await request('/profile/me', undefined, 401, 'GET', undefined, jwt.sign(payload, { expiresIn: -1 }));
  await request('/profile/me', undefined, 401, 'GET', undefined, jwt.sign(payload, { secret: 'wrong-signature-key' }));
  await request('/profile/me', undefined, 401, 'GET', undefined, jwt.sign(payload, { algorithm: 'HS384' }));
  const previewPayload = { sub: 'google:synthetic-qa', purpose: 'google_preview', scope: 'calendar:read', name: 'Visitante QA', email: 'preview@demo.invalid' };
  const previewOptions = { audience: 'lepera-google-preview', issuer: 'lepera-clinic', expiresIn: '30m' };
  const preview = jwt.sign(previewPayload, previewOptions);
  await request('/profile/me', undefined, 401, 'GET', undefined, preview);
  await request('/patients', undefined, 401, 'GET', undefined, preview);
  await request('/preview/doctors', 'patientA', 401);
  await request('/preview/doctors', undefined, 401, 'GET', undefined, jwt.sign(previewPayload, { ...previewOptions, expiresIn: -1 }));
  await request('/preview/doctors', undefined, 401, 'GET', undefined, jwt.sign({ ...previewPayload, scope: 'patients:read' }, previewOptions));
  const doctors = await request('/preview/doctors', undefined, 200, 'GET', undefined, preview);
  limitedKeys(doctors.data.items, ['id', 'name', 'specialty', 'clinicalApproach']);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);
  const free = await request(`/preview/slots?from=${tomorrow}&to=${nextWeek}`, undefined, 200, 'GET', undefined, preview);
  assert.ok(free.data.items.length > 0);
  limitedKeys(free.data.items, ['doctorId', 'doctorName', 'start', 'end']);
  const team = await request('/public/clinic/team');
  limitedKeys(team.data.doctors, ['id', 'name', 'specialty', 'clinicalApproach', 'bio', 'licenseNumber', 'photoUrl']);
  limitedKeys(team.data.receptionists, ['id', 'name', 'photoUrl']);
  pass('Session expiry, signature, algorithm, role and password-version checks pass; synthetic Google-preview tokens only open free slots');
  checkedData = await clinicalSnapshot();
  assert.equal(checkedData, before, 'Clinical records or appointments changed during authorization checks');
  result.clinicalDataUnchanged = true;
  pass('Clinical content and appointments are unchanged after all negative authorization checks');
  assert.deepEqual(result.missingNoStore, [], 'Sensitive responses missing private, no-store');
  result.passed = true;
}

main().catch(error => {
  result.failureType = error.name;
  result.failureCode = error.code;
  result.failure = error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'QA prerequisites or execution failed';
  console.error(result.failure);
  console.error('Category: ' + error.name + (error.code ? ' / ' + error.code : ''));
  if (result.missingNoStore.length) console.error('Missing cache protection: ' + result.missingNoStore.join(', '));
  process.exitCode = 1;
}).finally(async () => {
  if (notifications.length) await db.notification.deleteMany({ where: { id: { in: notifications } } });
  if (before && !checkedData) result.clinicalDataUnchanged = (await clinicalSnapshot()) === before;
  await app?.close();
  await db.$disconnect();
  result.finishedAt = new Date().toISOString();
  const output = path.join(root, 'work/permission-check-results.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log('Aggregate evidence saved under work/permission-check-results.json (ignored by Git).');
});
