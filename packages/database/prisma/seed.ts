// packages/database/prisma/seed.ts
// import { PrismaClient } from '../generated/prisma';const prisma = new PrismaClient();
import { PrismaClient } from '../generated/prisma/index.js';
async function main() {
  console.log('Iniciando o seed do banco de dados...');

  // 1. Criar Administrador
  const admin = await prisma.user.upsert({
    where: { email: 'admin@leperapia.com' },
    update: {},
    create: {
      name: 'Gestor Admin',
      email: 'admin@leperapia.com',
      passwordHash: 'senha_criptografada_aqui', // Em produção, usar bcrypt
      cpf: '000.000.000-00',
      role: 'ADMIN',
    },
  });

  // 2. Criar Recepcionista
  const receptionist = await prisma.user.upsert({
    where: { email: 'recepcao@leperapia.com' },
    update: {},
    create: {
      name: 'Ana Recepcionista',
      email: 'recepcao@leperapia.com',
      passwordHash: 'senha_criptografada_aqui',
      cpf: '111.111.111-11',
      role: 'RECEPTIONIST',
      receptionist: {
        create: {
          extension: '101',
        },
      },
    },
  });

  // 3. Criar Médico/Psicólogo
  const doctor = await prisma.user.upsert({
    where: { email: 'roberto.silva@leperapia.com' },
    update: {},
    create: {
      name: 'Dr. Roberto Silva',
      email: 'roberto.silva@leperapia.com',
      passwordHash: 'senha_criptografada_aqui',
      cpf: '222.222.222-22',
      role: 'DOCTOR',
      doctor: {
        create: {
          licenseNumber: 'CRP 06/123456',
          specialty: 'Psicologia Clínica',
          clinicalApproach: 'Terapia Cognitivo-Comportamental (TCC)',
          bio: 'Especialista em transtornos de ansiedade e depressão.',
          room: 'Sala 01',
          availabilities: {
            create: [
              { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }, // Segunda
              { dayOfWeek: 3, startTime: '14:00', endTime: '18:00' }, // Quarta
            ],
          },
        },
      },
    },
  });

  const doctorProfile = await prisma.doctor.findUnique({ where: { userId: doctor.id } });

  // 4. Criar Paciente com Endereço e Telefone
  const patient = await prisma.user.upsert({
    where: { email: 'lucas.paciente@email.com' },
    update: {},
    create: {
      name: 'Lucas Pereira',
      email: 'lucas.paciente@email.com',
      passwordHash: 'senha_criptografada_aqui',
      cpf: '333.333.333-33',
      role: 'PATIENT',
      patient: {
        create: {
          insuranceProvider: 'Unimed',
          insuranceNumber: '999888777',
          emergencyContactName: 'Maria Pereira',
          emergencyContactPhone: '12999999999',
          responsibleDoctorId: doctorProfile?.id,
          addresses: {
            create: {
              street: 'Av. Dr. Arthur da Costa Filho',
              number: '100',
              neighborhood: 'Centro',
              city: 'Caraguatatuba',
              state: 'SP',
              zipCode: '11660-005',
            },
          },
          phones: {
            create: {
              type: 'whatsapp',
              phone: '12988887777',
            },
          },
        },
      },
    },
  });

  const patientProfile = await prisma.patient.findUnique({ where: { userId: patient.id } });
  const receptionistProfile = await prisma.receptionist.findUnique({ where: { userId: receptionist.id } });

  // 5. Criar Agendamento e Prontuário
  if (doctorProfile && patientProfile && receptionistProfile) {
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patientProfile.id,
        doctorId: doctorProfile.id,
        receptionistId: receptionistProfile.id,
        startDatetime: new Date(new Date().setHours(14, 0, 0, 0)), // Hoje às 14h
        endDatetime: new Date(new Date().setHours(14, 50, 0, 0)), // Hoje às 14h50
        durationMinutes: 50,
        modality: 'IN_PERSON',
        type: 'SESSION',
        status: 'COMPLETED',
        roomOrLink: 'Sala 01',
        sessionSequence: 1,
        progressNote: {
          create: {
            patientId: patientProfile.id,
            doctorId: doctorProfile.id,
            sessionSequence: 1,
            mainComplaint: 'Paciente relata picos de ansiedade no trabalho.',
            clinicalNotes: 'Sessão produtiva. Trabalhamos técnicas de respiração diafragmática.',
            homework: 'Praticar respiração 5 minutos por dia.',
            diagnosticHypothesis: 'F41.1 - Transtorno de ansiedade generalizada',
            approachUsed: 'TCC',
            isSigned: true,
            signedAt: new Date(),
          },
        },
        transaction: {
          create: {
            userId: receptionist.id,
            type: 'INCOME',
            amount: 150.0,
            description: 'Pagamento Sessão 1 - Lucas Pereira',
            transactionDate: new Date(),
          },
        },
      },
    });

    console.log(`Consulta e Prontuário gerados com sucesso (ID: ${appointment.id})`);
  }

  console.log('✅ Seed concluído! Banco populado com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });