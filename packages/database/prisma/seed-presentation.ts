/** Additive, repeatable presentation data. Never deletes or resets existing records. */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import { createPrismaClient } from "../client";

if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  process.env.NODE_ENV === "production"
) {
  throw new Error(
    "Use ALLOW_DEMO_SEED=true apenas no banco de demonstração. Nunca use este script com dados reais.",
  );
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida.");
const db = createPrismaClient(process.env.DATABASE_URL);
const marker = "DEMO-NOV-DEZ-2026";
const uuid = (key: string) => {
  const h = createHash("sha256").update(`${marker}:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
function cpf(index: number) {
  let s = String(840100000 + index);
  for (let n = 10; n <= 11; n++) {
    const remainder =
      ([...s].reduce((sum, d, i) => sum + Number(d) * (n - i), 0) * 10) % 11;
    s += remainder === 10 ? "0" : String(remainder);
  }
  return s;
}
const at = (day: string, minute: number) =>
  new Date(
    `${day}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00-03:00`,
  );
const minute = (value: string) =>
  Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

async function main() {
  const password = process.env.SEED_PASSWORD || "Senha@123";
  if (password.length < 8 || password.length > 72)
    throw new Error("SEED_PASSWORD deve ter entre 8 e 72 caracteres.");
  const passwordHash = await bcrypt.hash(password, 12);
  const stats = await db.$transaction(
    async (tx) => {
      for (const [i, item] of [
        {
          name: "Dra. Helena Duarte",
          specialty: "Neuropsicologia",
          approach: "Terapia Cognitivo-Comportamental",
        },
        {
          name: "Dr. André Martins",
          specialty: "Psicologia Escolar/Educacional",
          approach: "Abordagem centrada na pessoa",
        },
      ].entries()) {
        const email = `psicologo${i + 1}@demo.invalid`;
        const user = await tx.user.upsert({
          where: { email },
          update: {},
          create: {
            id: uuid(`doctor-user-${i}`),
            name: item.name,
            email,
            cpf: cpf(i),
            passwordHash,
            role: "DOCTOR",
            birthDate: new Date(`198${i + 4}-05-15T12:00:00Z`),
            doctor: {
              create: {
                id: uuid(`doctor-${i}`),
                licenseNumber: `CRP 06/90000${i + 1}`,
                specialty: item.specialty,
                clinicalApproach: item.approach,
                bio: "Perfil inteiramente fictício para demonstração acadêmica.",
                room: `Sala 0${i + 3}`,
                availabilities: {
                  create: [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
                    {
                      id: uuid(`availability-${i}-${dayOfWeek}-am`),
                      dayOfWeek,
                      startTime: "09:00",
                      endTime: "12:00",
                    },
                    {
                      id: uuid(`availability-${i}-${dayOfWeek}-pm`),
                      dayOfWeek,
                      startTime: "14:00",
                      endTime: "18:00",
                    },
                  ]),
                },
              },
            },
          },
          select: { role: true, doctor: { select: { id: true } } },
        });
        if (user.role !== "DOCTOR" || !user.doctor)
          throw new Error(
            "Identidade de demonstração em conflito; nenhuma conta será alterada.",
          );
      }
      // Correct only this known fictitious profile, preserving practitioner/user data.
      await tx.doctor.updateMany({
        where: {
          user: { email: "camila.almeida@leperapia.com" },
          specialty: "Psicologia da Saúde",
          bio: { contains: "fictício" },
        },
        data: { specialty: "Psicologia em Saúde" },
      });
      const doctors = await tx.doctor.findMany({
        where: {
          user: {
            isActive: true,
            email: {
              in: [
                "roberto.silva@leperapia.com",
                "camila.almeida@leperapia.com",
                "psicologo1@demo.invalid",
                "psicologo2@demo.invalid",
              ],
            },
          },
        },
        include: { availabilities: { where: { isActive: true } } },
        orderBy: { id: "asc" },
      });
      if (!doctors.length)
        throw new Error("Nenhum profissional de demonstração disponível.");
      const names = [
        "Alice Ribeiro",
        "Bruno Mendes",
        "Clara Nogueira",
        "Daniel Azevedo",
        "Elisa Monteiro",
        "Felipe Barros",
        "Gabriela Lima",
        "Henrique Reis",
        "Iara Batista",
        "João Teixeira",
        "Lara Campos",
        "Miguel Farias",
        "Nina Moreira",
        "Otávio Correia",
        "Paula Rocha",
        "Tiago Freitas",
      ];
      for (const [i, name] of names.entries()) {
        const email = `paciente${String(i + 1).padStart(2, "0")}@demo.invalid`;
        const user = await tx.user.upsert({
          where: { email },
          update: {},
          create: {
            id: uuid(`patient-user-${i}`),
            name,
            email,
            cpf: cpf(i + 100),
            passwordHash,
            role: "PATIENT",
            birthDate: new Date(`199${i % 10}-06-15T12:00:00Z`),
            patient: {
              create: {
                id: uuid(`patient-${i}`),
                responsibleDoctorId: doctors[i % doctors.length]!.id,
                phones: {
                  create: {
                    type: "mobile",
                    phone: `1199000${String(i + 1000)}`,
                  },
                },
              },
            },
          },
          select: { role: true, patient: { select: { id: true } } },
        });
        if (user.role !== "PATIENT" || !user.patient)
          throw new Error(
            "Identidade de demonstração em conflito; nenhuma conta será alterada.",
          );
      }
      const patients = await tx.patient.findMany({
        where: {
          user: {
            isActive: true,
            OR: [
              { email: { endsWith: "@demo.invalid" } },
              { email: "lucas.paciente@email.com" },
            ],
          },
        },
        select: { id: true, userId: true },
        orderBy: { id: "asc" },
      });
      const reviewer = await tx.receptionist.findFirst({
        where: { user: { isActive: true, email: "recepcao@leperapia.com" } },
        select: { id: true, userId: true },
      });
      const manager = await tx.user.findFirst({
        where: { isActive: true, role: { in: ["ADMIN", "SUPER_ADMIN"] } },
        select: { id: true },
      });
      if (!patients.length || !manager)
        throw new Error(
          "Faltam pacientes ou administrador para os dados de demonstração.",
        );
      const begin = new Date("2026-11-01T00:00:00-03:00"),
        end = new Date("2027-01-01T00:00:00-03:00");
      const busy = await tx.appointment.findMany({
        where: {
          startDatetime: { lt: end },
          endDatetime: { gt: begin },
          status: { notIn: ["CANCELLED", "RESCHEDULED"] },
        },
        select: {
          id: true,
          doctorId: true,
          patientId: true,
          startDatetime: true,
          endDatetime: true,
        },
      });
      const existingIds = new Set(busy.map((r) => r.id));
      let appointments = 0,
        skippedConflicts = 0,
        requests = 0,
        financial = 0,
        counter = 0;
      const futureFree: { day: string; start: Date; doctorId: string }[] = [];
      for (
        let d = new Date("2026-11-01T12:00:00Z");
        d < end;
        d = new Date(d.getTime() + 86400000)
      ) {
        const day = d.toISOString().slice(0, 10),
          weekday = d.getUTCDay();
        for (const doctor of doctors)
          for (const availability of doctor.availabilities.filter(
            (a) => a.dayOfWeek === weekday,
          )) {
            const first = minute(availability.startTime),
              last = minute(availability.endTime);
            for (let m = first; m + 50 <= last; m += 50) {
              const start = at(day, m),
                finish = new Date(start.getTime() + 50 * 60000);
              const key = uuid(`appointment-${doctor.id}-${day}-${m}`);
              // One appointment per availability block; leave ample choice throughout both months.
              if (m !== first) {
                if (
                  start > new Date() &&
                  !busy.some(
                    (b) =>
                      b.doctorId === doctor.id &&
                      b.startDatetime < finish &&
                      b.endDatetime > start,
                  )
                )
                  futureFree.push({ day, start, doctorId: doctor.id });
                continue;
              }
              if (existingIds.has(key)) continue;
              const patient = patients[counter++ % patients.length]!;
              if (
                busy.some(
                  (b) =>
                    (b.doctorId === doctor.id || b.patientId === patient.id) &&
                    b.startDatetime < finish &&
                    b.endDatetime > start,
                )
              ) {
                skippedConflicts++;
                continue;
              }
              const completed = finish < new Date();
              await tx.appointment.create({
                data: {
                  id: key,
                  doctorId: doctor.id,
                  patientId: patient.id,
                  receptionistId: reviewer?.id,
                  startDatetime: start,
                  endDatetime: finish,
                  durationMinutes: 50,
                  status: completed
                    ? "COMPLETED"
                    : counter % 3 === 0
                      ? "CONFIRMED"
                      : "SCHEDULED",
                  modality: counter % 4 === 0 ? "ONLINE" : "IN_PERSON",
                  type: "SESSION",
                  roomOrLink: doctor.room,
                  receptionNotes: `${marker}: atendimento fictício para apresentação.`,
                },
              });
              busy.push({
                id: key,
                doctorId: doctor.id,
                patientId: patient.id,
                startDatetime: start,
                endDatetime: finish,
              });
              appointments++;
              if (counter % 3 === 0) {
                const civil = new Date(`${day}T00:00:00Z`);
                await tx.financialTransaction.upsert({
                  where: { id: uuid(`financial-${key}`) },
                  update: {},
                  create: {
                    id: uuid(`financial-${key}`),
                    appointmentId: key,
                    userId: reviewer?.userId ?? manager.id,
                    type: "INCOME",
                    amount: "180.00",
                    description: `${marker}: sessão demonstrativa`,
                    status: completed ? "PAID" : "PENDING",
                    dueDate: civil,
                    paidAt: completed ? civil : null,
                    paymentMethod: completed ? "PIX" : null,
                    category: "Consultas",
                    transactionDate: completed ? civil : start,
                  },
                });
                financial++;
              }
            }
          }
      }
      for (const month of ["2026-11", "2026-12"]) {
        const sample = futureFree
          .filter((s) => s.day.startsWith(month))
          .filter((_, i) => i % 11 === 0)
          .slice(0, 8);
        for (const [i, slot] of sample.entries()) {
          const patient = patients[(i + 3) % patients.length]!;
          if (
            busy.some(
              (b) =>
                b.patientId === patient.id &&
                b.startDatetime < new Date(slot.start.getTime() + 50 * 60000) &&
                b.endDatetime > slot.start,
            )
          )
            continue;
          await tx.scheduleRequest.upsert({
            where: { id: uuid(`exact-${month}-${i}`) },
            update: {},
            create: {
              id: uuid(`exact-${month}-${i}`),
              patientId: patient.id,
              preferredDoctorId: slot.doctorId,
              requestedStartDatetime: slot.start,
              preferredDate: new Date(`${slot.day}T12:00:00Z`),
              mode: "EXACT",
              type: "novo_paciente",
              durationMinutes: 50,
              modality: i % 2 === 0 ? "IN_PERSON" : "ONLINE",
              reason: `${marker}: pedido fictício com horário escolhido.`,
            },
          });
          requests++;
        }
        for (let i = 0; i < 2; i++)
          await tx.scheduleRequest.upsert({
            where: { id: uuid(`flexible-${month}-${i}`) },
            update: {},
            create: {
              id: uuid(`flexible-${month}-${i}`),
              patientId: patients[i]!.id,
              preferredDate: new Date(
                `${month}-${i === 0 ? "24" : "26"}T12:00:00Z`,
              ),
              preferredShift: i === 0 ? "MORNING" : "AFTERNOON",
              mode: "FLEXIBLE",
              type: "novo_paciente",
              reason: `${marker}: paciente aceita flexibilidade de horário (encaixe).`,
            },
          });
        await tx.financialTransaction.upsert({
          where: { id: uuid(`expense-${month}`) },
          update: {},
          create: {
            id: uuid(`expense-${month}`),
            userId: manager.id,
            type: "EXPENSE",
            amount: "1200.00",
            description: `${marker}: despesa fictícia de locação`,
            status: "PENDING",
            dueDate: new Date(`${month}-05T00:00:00Z`),
            transactionDate: new Date(`${month}-05T12:00:00Z`),
            category: "Aluguel",
          },
        });
      }
      return {
        newAppointments: appointments,
        skippedConflicts,
        exactRequestsEnsured: requests,
        flexibleRequestsEnsured: 4,
        financialCreated: financial,
        doctors: doctors.length,
        patients: patients.length,
        period: "2026-11-01 a 2026-12-31",
      };
    },
    { timeout: 180000, maxWait: 15000 },
  );
  console.log(JSON.stringify(stats, null, 2));
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Falha ao gerar demonstração",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
