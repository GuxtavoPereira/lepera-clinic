// packages/database/prisma/seed.ts
import "dotenv/config";
import bcrypt from "bcryptjs";
import { createPrismaClient } from "../client";

if (process.env.NODE_ENV === "production") {
  throw new Error("O seed usa senhas conhecidas e não pode rodar em produção.");
}

const prisma = createPrismaClient(process.env.DATABASE_URL!);

const DEV_PASSWORD = "Senha@123";

async function main() {
  console.log("Iniciando o seed do banco de dados...");

  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // 1. Administrador
  await prisma.user.upsert({
    where: { email: "admin@leperapia.com" },
    update: {},
    create: {
      name: "Gestor Admin",
      email: "admin@leperapia.com",
      passwordHash,
      cpf: "00000000000",
      role: "ADMIN",
    },
  });

  // 2. Recepcionista
  const receptionist = await prisma.user.upsert({
    where: { email: "recepcao@leperapia.com" },
    update: {},
    create: {
      name: "Ana Recepcionista",
      email: "recepcao@leperapia.com",
      passwordHash,
      cpf: "11111111111",
      role: "RECEPTIONIST",
      receptionist: { create: { extension: "101" } },
    },
    include: { receptionist: true },
  });

  // 3. Médico/Psicólogo
  const doctor = await prisma.user.upsert({
    where: { email: "roberto.silva@leperapia.com" },
    update: {},
    create: {
      name: "Dr. Roberto Silva",
      email: "roberto.silva@leperapia.com",
      passwordHash,
      cpf: "22222222222",
      role: "DOCTOR",
      doctor: {
        create: {
          licenseNumber: "CRP 06/123456",
          specialty: "Psicologia Clínica",
          clinicalApproach: "Terapia Cognitivo-Comportamental (TCC)",
          bio: "Especialista em transtornos de ansiedade e depressão.",
          room: "Sala 01",
          availabilities: {
            create: [
              { dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }, // Segunda
              { dayOfWeek: 3, startTime: "14:00", endTime: "18:00" }, // Quarta
            ],
          },
        },
      },
    },
    include: { doctor: true },
  });

  const doctorProfile = doctor.doctor;
  const receptionistProfile = receptionist.receptionist;

  // 4. Paciente com endereço e telefone
  const patient = await prisma.user.upsert({
    where: { email: "lucas.paciente@email.com" },
    update: {},
    create: {
      name: "Lucas Pereira",
      email: "lucas.paciente@email.com",
      passwordHash,
      cpf: "33333333333",
      role: "PATIENT",
      patient: {
        create: {
          insuranceProvider: "Unimed",
          insuranceNumber: "999888777",
          emergencyContactName: "Maria Pereira",
          emergencyContactPhone: "12999999999",
          responsibleDoctorId: doctorProfile?.id,
          addresses: {
            create: {
              street: "Av. Dr. Arthur da Costa Filho",
              number: "100",
              neighborhood: "Centro",
              city: "Caraguatatuba",
              state: "SP",
              zipCode: "11660-005",
            },
          },
          phones: { create: { type: "whatsapp", phone: "12988887777" } },
        },
      },
    },
    include: { patient: true },
  });

  const patientProfile = patient.patient;

  // 5. Agendamento + prontuário + pagamento (só cria uma vez)
  if (doctorProfile && patientProfile && receptionistProfile) {
    const alreadySeeded = await prisma.appointment.findFirst({
      where: { patientId: patientProfile.id, sessionSequence: 1 },
    });

    if (!alreadySeeded) {
      const appointment = await prisma.appointment.create({
        data: {
          patientId: patientProfile.id,
          doctorId: doctorProfile.id,
          receptionistId: receptionistProfile.id,
          startDatetime: new Date(new Date().setHours(14, 0, 0, 0)),
          endDatetime: new Date(new Date().setHours(14, 50, 0, 0)),
          durationMinutes: 50,
          modality: "IN_PERSON",
          type: "SESSION",
          status: "COMPLETED",
          roomOrLink: "Sala 01",
          sessionSequence: 1,
          progressNote: {
            create: {
              patientId: patientProfile.id,
              doctorId: doctorProfile.id,
              sessionSequence: 1,
              mainComplaint: "Paciente relata picos de ansiedade no trabalho.",
              clinicalNotes: "Sessão produtiva. Trabalhamos técnicas de respiração diafragmática.",
              homework: "Praticar respiração 5 minutos por dia.",
              diagnosticHypothesis: "F41.1 - Transtorno de ansiedade generalizada",
              approachUsed: "TCC",
              isSigned: true,
              signedAt: new Date(),
            },
          },
          transaction: {
            create: {
              userId: receptionist.id,
              type: "INCOME",
              amount: 150.0,
              description: "Pagamento Sessão 1 - Lucas Pereira",
              transactionDate: new Date(),
            },
          },
        },
      });

      console.log(`Consulta e prontuário gerados (ID: ${appointment.id})`);
    }
  }

  console.log(`✅ Seed concluído! Login de teste: qualquer e-mail acima com a senha "${DEV_PASSWORD}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });