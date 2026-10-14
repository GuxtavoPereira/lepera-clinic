// Seed de desenvolvimento da Lepera Clinic.
// Recriar o banco de demonstração: RESET_DATABASE=true pnpm db:seed
// Dados de usuários e prontuários abaixo são inteiramente fictícios.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { createCipheriv, randomBytes, randomUUID } from "node:crypto";
import { createPrismaClient } from "../client";
import type { Prisma } from "../generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("O seed contém credenciais conhecidas e dados clínicos fictícios; não pode rodar em produção.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida.");

const client = createPrismaClient(process.env.DATABASE_URL);
const keyHex = process.env.ENCRYPTION_KEY;
if (!keyHex || !/^[a-fA-F0-9]{64}$/.test(keyHex)) {
  throw new Error("Configure ENCRYPTION_KEY com 64 caracteres hexadecimais, igual à chave da API, antes de executar o seed.");
}
const encryptionKey = Buffer.from(keyHex, "hex");
const DEV_PASSWORD = process.env.SEED_PASSWORD || "Senha@123";
if (DEV_PASSWORD.length < 8 || DEV_PASSWORD.length > 72) throw new Error("SEED_PASSWORD precisa ter entre 8 e 72 caracteres.");
const RESET_DATABASE = process.env.RESET_DATABASE === "true";
type ClinicalField = "mainComplaint" | "clinicalNotes" | "homework" | "diagnosticHypothesis" | "cid10" | "dsm5" | "approachUsed" | "therapeuticPlan";

function cpf(base: string) {
  const digits = base.replace(/\D/g, "").slice(0, 9);
  const digit = (value: string, factor: number) => {
    const sum = [...value].reduce((acc, n, i) => acc + Number(n) * (factor - i), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const first = digit(digits, 10);
  return `${digits}${first}${digit(`${digits}${first}`, 11)}`;
}

function encryptClinicalField(value: string, recordId: string, field: ClinicalField) {
  const nonce = randomBytes(12);
  const actualCipher = createCipheriv("aes-256-gcm", encryptionKey, nonce);
  actualCipher.setAAD(Buffer.from(`clinical_record:${recordId}:${field}`, "utf8"));
  const encrypted = Buffer.concat([actualCipher.update(value, "utf8"), actualCipher.final()]);
  return ["v1", nonce.toString("base64"), actualCipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(":");
}

function dateAtOffset(days: number, hour: number, minute = 0) {
  const now = new Date();
  const clinicDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const date = new Date(`${clinicDate}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00-03:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

function nextAvailableSlot(doctorIndex: number, daysFromNow: number) {
  const weekdays = doctorIndex % 2 === 0 ? [1, 3, 5] : [2, 4, 6];
  for (let days = daysFromNow; days < daysFromNow + 7; days++) {
    const date = dateAtOffset(days, 9);
    const weekday = date.getUTCDay();
    if (weekdays.includes(weekday)) return dateAtOffset(days, weekday === 3 || weekday === 4 ? 14 : 9);
  }
  throw new Error("Não foi possível gerar um horário de demonstração.");
}

async function clearDatabase(prisma: Prisma.TransactionClient) {
  console.warn("RESET_DATABASE=true: apagando os dados existentes deste banco...");
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.sessionScale.deleteMany();
  await prisma.review.deleteMany();
  await prisma.clinicalRecord.deleteMany();
  await prisma.cancellationRequest.deleteMany();
  await prisma.scheduleRequest.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.appointment.updateMany({ data: { rescheduledToId: null } });
  await prisma.appointment.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.patientAddress.deleteMany();
  await prisma.patientPhone.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.receptionist.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.user.deleteMany();
}

async function seed(prisma: Prisma.TransactionClient) {
  if (RESET_DATABASE) await clearDatabase(prisma);
  else if (await prisma.user.count()) {
    throw new Error("O banco já contém usuários. Para substituir os dados atuais pelos mocks, execute RESET_DATABASE=true pnpm db:seed. Isso apagará os dados deste banco.");
  }

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);
  const superAdmin = await prisma.user.create({ data: { name: "Super Administrador (dev)", email: "super@leperapia.com", passwordHash, cpf: cpf("529982247"), role: "SUPER_ADMIN" } });
  await prisma.user.create({ data: { name: "Gestor Administrativo", email: "admin@leperapia.com", passwordHash, cpf: cpf("111444777"), role: "ADMIN" } });

  const receptionists = await Promise.all([
    prisma.user.create({ data: { name: "Ana Costa", email: "recepcao@leperapia.com", passwordHash, cpf: cpf("123456789"), role: "RECEPTIONIST", receptionist: { create: { extension: "101" } } }, include: { receptionist: true } }),
    prisma.user.create({ data: { name: "Mariana Souza", email: "mariana.recepcao@leperapia.com", passwordHash, cpf: cpf("987654321"), role: "RECEPTIONIST", receptionist: { create: { extension: "102" } } }, include: { receptionist: true } }),
  ]);
  const doctors = await Promise.all([
    prisma.user.create({ data: { name: "Dr. Roberto Silva", email: "roberto.silva@leperapia.com", passwordHash, cpf: cpf("390533447"), birthDate: new Date("1982-04-12T12:00:00Z"), role: "DOCTOR", doctor: { create: { licenseNumber: "CRP 06/123456", specialty: "Psicologia Clínica", clinicalApproach: "Terapia Cognitivo-Comportamental (TCC)", bio: "Perfil fictício para demonstração.", room: "Sala 01", availabilities: { create: [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 3, startTime: "13:00", endTime: "18:00" }, { dayOfWeek: 5, startTime: "08:00", endTime: "12:00" }] } } } }, include: { doctor: true } }),
    prisma.user.create({ data: { name: "Dra. Camila Almeida", email: "camila.almeida@leperapia.com", passwordHash, cpf: cpf("168995350"), birthDate: new Date("1987-09-23T12:00:00Z"), role: "DOCTOR", doctor: { create: { licenseNumber: "CRP 06/654321", specialty: "Psicologia da Saúde", clinicalApproach: "Abordagem centrada na pessoa", bio: "Perfil fictício para testes de agenda.", room: "Sala 02", availabilities: { create: [{ dayOfWeek: 2, startTime: "08:00", endTime: "12:00" }, { dayOfWeek: 4, startTime: "13:00", endTime: "18:00" }, { dayOfWeek: 6, startTime: "08:00", endTime: "12:00" }] } } } }, include: { doctor: true } }),
  ]);
  const doctorProfiles = doctors.map((user) => user.doctor!);

  const mockPatients = [
    { name: "Lucas Pereira", email: "lucas.paciente@email.com", cpf: "286255878", birth: "1995-03-18", plan: "Unimed" },
    { name: "Beatriz Oliveira", email: "beatriz.oliveira@email.com", cpf: "714287938", birth: "2001-07-09", plan: "Particular" },
    { name: "Rafael Santos", email: "rafael.santos@email.com", cpf: "053289759", birth: "1988-11-27", plan: "Amil" },
    { name: "Isabela Ferreira", email: "isabela.ferreira@email.com", cpf: "145382206", birth: "1998-01-15", plan: "Unimed" },
    { name: "Pedro Carvalho", email: "pedro.carvalho@email.com", cpf: "314159265", birth: "2004-05-30", plan: "Particular" },
    { name: "Sofia Rodrigues", email: "sofia.rodrigues@email.com", cpf: "271828182", birth: "1992-12-04", plan: "Bradesco Saúde" },
  ];
  const patients = [];
  for (let i = 0; i < mockPatients.length; i++) {
    const item = mockPatients[i];
    const phone = `1299999000${i + 1}`;
    const user = await prisma.user.create({
      data: {
        name: item.name, email: item.email, passwordHash, cpf: cpf(item.cpf), birthDate: new Date(`${item.birth}T12:00:00Z`), role: "PATIENT",
        patient: { create: {
          insuranceProvider: item.plan === "Particular" ? null : item.plan,
          insuranceNumber: item.plan === "Particular" ? null : `DEMO-${String(i + 1).padStart(4, "0")}`,
          emergencyContactName: `Contato de ${item.name}`, emergencyContactPhone: phone,
          responsibleDoctorId: doctorProfiles[i % doctorProfiles.length].id,
          addresses: { create: { street: ["Rua das Palmeiras", "Av. Anchieta", "Rua Sebastião Mariano", "Rua São Benedito", "Rua dos Pescadores", "Av. Miguel Varlez"][i], number: String(100 + i * 17), neighborhood: ["Centro", "Indaiá", "Martim de Sá", "Sumaré", "Jardim Primavera", "Pontal de Santa Marina"][i], city: "Caraguatatuba", state: "SP", zipCode: `1166${i}-000` } },
          phones: { create: [{ type: "mobile", phone }, { type: "whatsapp", phone: `1298888000${i + 1}` }] },
        } },
      }, include: { patient: true },
    });
    patients.push({ user, profile: user.patient! });
  }

  let appointmentCount = 0;
  let recordCount = 0;
  for (let i = 0; i < patients.length; i++) {
    const { user: patientUser, profile: patient } = patients[i];
    const doctor = doctorProfiles[i % doctorProfiles.length];
    const receptionist = receptionists[i % receptionists.length];
    for (const [sessionIndex, daysAgo] of [28 + i, 14 + i].entries()) {
      const startDatetime = dateAtOffset(-daysAgo, sessionIndex === 0 ? 9 : 10);
      const appointment = await prisma.appointment.create({ data: {
        patientId: patient.id, doctorId: doctor.id, receptionistId: receptionist.receptionist!.id,
        startDatetime, endDatetime: new Date(startDatetime.getTime() + 50 * 60_000), durationMinutes: 50,
        modality: sessionIndex === 0 ? "IN_PERSON" : "ONLINE", type: sessionIndex === 0 ? "EVALUATION" : "SESSION", status: "COMPLETED",
        roomOrLink: sessionIndex === 0 ? doctor.room : "https://meet.example.test/lepera-demo", sessionSequence: sessionIndex + 1,
      } });
      appointmentCount++;
      const recordId = randomUUID();
      const values: Record<ClinicalField, string> = {
        mainComplaint: "DADO FICTÍCIO: acompanhamento demonstrativo para manejo do estresse.",
        clinicalNotes: sessionIndex === 0 ? "PRONTUÁRIO FICTÍCIO: objetivos iniciais e estratégias gerais de autocuidado foram combinados." : "PRONTUÁRIO FICTÍCIO: revisão das estratégias combinadas na sessão anterior.",
        homework: "Exercício demonstrativo de autocuidado para popular a interface; não utilizar em atendimento real.",
        diagnosticHypothesis: "Dado demonstrativo sem valor diagnóstico; não utilizar para decisões clínicas.",
        cid10: "", dsm5: "", approachUsed: doctor.clinicalApproach ?? "Abordagem demonstrativa",
        therapeuticPlan: "Plano fictício exclusivamente para teste da interface e da API.",
      };
      await prisma.clinicalRecord.create({ data: {
        id: recordId, appointmentId: appointment.id, patientId: patient.id, doctorId: doctor.id, sessionSequence: sessionIndex + 1,
        mainComplaint: encryptClinicalField(values.mainComplaint, recordId, "mainComplaint"),
        clinicalNotes: encryptClinicalField(values.clinicalNotes, recordId, "clinicalNotes"),
        homework: encryptClinicalField(values.homework, recordId, "homework"),
        diagnosticHypothesis: encryptClinicalField(values.diagnosticHypothesis, recordId, "diagnosticHypothesis"),
        cid10: null, dsm5: null,
        approachUsed: encryptClinicalField(values.approachUsed, recordId, "approachUsed"),
        therapeuticPlan: encryptClinicalField(values.therapeuticPlan, recordId, "therapeuticPlan"),
        nextSessionDate: dateAtOffset(7 + i, 9), nextSessionRoom: doctor.room,
        isSigned: sessionIndex === 0, signedAt: sessionIndex === 0 ? new Date(startDatetime.getTime() + 55 * 60_000) : null,
        documentNumber: `PRON-DEMO-${String(i + 1).padStart(3, "0")}-${sessionIndex + 1}`,
      } });
      recordCount++;
      if (sessionIndex === 0) await prisma.financialTransaction.create({ data: { appointmentId: appointment.id, userId: receptionist.id, type: "INCOME", amount: 180, description: `Pagamento demonstrativo - ${patientUser.name}`, transactionDate: startDatetime } });
    }

    const futureStart = nextAvailableSlot(i % doctorProfiles.length, 2 + i * 2);
    await prisma.appointment.create({ data: {
      patientId: patient.id, doctorId: doctor.id, receptionistId: receptionist.receptionist!.id,
      startDatetime: futureStart, endDatetime: new Date(futureStart.getTime() + 50 * 60_000), durationMinutes: 50,
      modality: i % 2 === 0 ? "IN_PERSON" : "ONLINE", type: i === 0 ? "RETURN" : "SESSION",
      status: i % 2 === 0 ? "CONFIRMED" : "SCHEDULED", roomOrLink: i % 2 === 0 ? doctor.room : "https://meet.example.test/lepera-demo",
      sessionSequence: 3, receptionNotes: "Agendamento fictício para demonstração; não corresponde a paciente real.",
    } });
    appointmentCount++;
    if (i === 0) await prisma.scheduleRequest.create({ data: { patientId: patient.id, preferredDoctorId: doctor.id, type: "reagendamento", preferredDate: dateAtOffset(10, 10), preferredShift: "MORNING", reason: "Solicitação fictícia para testar a fila de pedidos.", status: "PENDING" } });
    if (i === 1) await prisma.waitlist.create({ data: { patientId: patient.id, preferredDoctorId: doctor.id, reason: "Preferência fictícia por horário pela manhã.", preferredShift: "MORNING", priority: "MEDIUM", status: "waiting" } });
  }

  await prisma.inventoryItem.createMany({ data: [
    { name: "Papel A4", description: "Material de escritório demonstrativo", stockQuantity: 12, minimumStock: 5 },
    { name: "Canetas azuis", description: "Material de escritório demonstrativo", stockQuantity: 3, minimumStock: 10 },
    { name: "Lenços descartáveis", description: "Material de atendimento demonstrativo", stockQuantity: 25, minimumStock: 8 },
  ] });

  console.log("Seed concluído com dados fictícios.");
  console.log(`Usuários: ${2 + receptionists.length + doctors.length + patients.length}; consultas: ${appointmentCount}; prontuários cifrados: ${recordCount}.`);
  console.log(`Super admin de demonstração: ${superAdmin.email}. Use a senha de demonstração configurada no seed.`);
}

async function main() {
  await client.$transaction(seed, { maxWait: 20_000, timeout: 120_000 });
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Falha ao executar o seed."); process.exitCode = 1; }).finally(async () => { await client.$disconnect(); });
