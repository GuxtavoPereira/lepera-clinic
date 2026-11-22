// Real PostgreSQL regression: password preparation must not consume the transaction timeout.
// Only the explicitly named loopback QA database is accepted. No email is sent.
const assert = require('node:assert/strict');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const database = new URL(process.env.LEPERA_REGISTRATION_DATABASE_URL ?? 'invalid:');
assert.equal(database.protocol, 'postgresql:');
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '51235');
assert.equal(database.pathname, '/lepera_native_qa');
const { createPrismaClient } = require(path.join(root, 'packages/database/dist'));
const { UsersService } = require(path.join(root, 'apps/api/dist/modules/users/users.service'));
const { PatientsService } = require(path.join(root, 'apps/api/dist/modules/patients/patients.service'));
const { PasswordService } = require(path.join(root, 'apps/api/dist/modules/users/password.service'));
const db = createPrismaClient(database.toString());
const passwords = new PasswordService();
let delay = true;
const delayedPasswords = {
  hash: async plain => {
    if (delay) await new Promise(resolve => setTimeout(resolve, 5200));
    return passwords.hash(plain);
  },
};
const users = new UsersService({ db }, delayedPasswords);
const patients = new PatientsService({ db }, users, {});
const email = `registration-qa-${randomUUID()}@example.invalid`;
const digits = [...randomBytes(9)].map(n => n % 10);
for (let length = 9; length <= 10; length++) {
  const rest = digits.reduce((sum, digit, index) => sum + digit * (length + 1 - index), 0) % 11;
  digits.push(rest < 2 ? 0 : 11 - rest);
}
const patient = {
  name: 'Menor Sintetico QA', email, password: randomBytes(18).toString('base64url'),
  cpf: digits.join(''), birthDate: '2014-06-10', phone: '11999999999',
  emergencyContactName: 'Responsavel Sintetico QA', emergencyContactPhone: '11988888888',
};
async function counts() {
  return Promise.all([db.user.count(), db.patient.count(), db.patientPhone.count()]);
}
(async () => {
  const before = await counts();
  try {
    assert.equal(await db.user.count({ where: { OR: [{ email }, { cpf: patient.cpf }] } }), 0);
    await assert.rejects(
      patients.create({ ...patient, emergencyContactName: undefined }),
      error => error.getStatus?.() === 400,
    );
    assert.deepEqual(await counts(), before);
    console.log('PASS: minor without guardian rejected without writes');

    const created = await patients.create(patient);
    assert.ok(created.id);
    assert.equal(created.passwordHash, undefined);
    const saved = await db.user.findUniqueOrThrow({ where: { email }, include: { patient: { include: { phones: true } } } });
    assert.equal(saved.role, 'PATIENT');
    assert.equal(saved.patient.emergencyContactName, patient.emergencyContactName);
    assert.equal(saved.patient.emergencyContactPhone, patient.emergencyContactPhone);
    assert.equal(saved.patient.phones[0].phone, patient.phone);
    assert.ok(await passwords.verify(patient.password, saved.passwordHash));
    console.log('PASS: password preparation over 5s, guardian and phone persisted, password valid');

    delay = false;
    await assert.rejects(patients.create(patient), error => error.getStatus?.() === 409);
    assert.deepEqual(await counts(), before.map(value => value + 1));
    console.log('PASS: duplicate rejected without orphan user or profile');
  } finally {
    try {
      await db.user.deleteMany({ where: { email } });
      assert.deepEqual(await counts(), before);
    } finally {
      await db.$disconnect();
    }
  }
  console.log('PASS: all owned fixtures removed');
})().catch(error => { console.error(error.code ?? error.message); process.exitCode = 1; });
