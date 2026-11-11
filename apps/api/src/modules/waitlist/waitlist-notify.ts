import type { DbClient } from '../../prisma/prisma.types';
import {
  CLINIC_TIMEZONE,
  toClinicTime,
} from '../availability/availability.check';

/** Quantos pacientes da fila são avisados a cada vaga liberada. */
export const MAX_NOTIFIED_PER_SLOT = 3;

/**
 * RF11 — quando uma consulta é cancelada, avisa (notificação interna) os
 * primeiros da lista de espera que combinam com a vaga: mesmo profissional
 * (ou "qualquer profissional") e turno compatível. Ordem: prioridade, depois
 * quem entrou primeiro. Quem foi avisado passa a "notified".
 *
 * Chame DENTRO da transação do cancelamento (`db` = tx). Devolve quantos
 * pacientes foram avisados.
 */
export async function notifyWaitlistOnFreedSlot(
  db: DbClient,
  slot: { doctorId: string; startDatetime: Date },
  now = new Date(),
): Promise<number> {
  if (slot.startDatetime <= now) return 0; // vaga no passado não interessa

  const shift =
    toClinicTime(slot.startDatetime).minutes < 12 * 60
      ? ('MORNING' as const)
      : ('AFTERNOON' as const);

  const entries = await db.waitlist.findMany({
    where: {
      status: 'waiting',
      AND: [
        {
          OR: [
            { preferredDoctorId: slot.doctorId },
            { preferredDoctorId: null },
          ],
        },
        {
          OR: [
            { preferredShift: null },
            { preferredShift: 'INDIFFERENT' },
            { preferredShift: shift },
          ],
        },
      ],
    },
    orderBy: [{ priority: 'asc' }, { enteredAt: 'asc' }],
    take: MAX_NOTIFIED_PER_SLOT,
    select: { id: true, patient: { select: { userId: true } } },
  });
  if (entries.length === 0) return 0;

  const claimed = await db.waitlist.updateManyAndReturn({
    where: { id: { in: entries.map((entry) => entry.id) }, status: 'waiting' },
    data: { status: 'notified' },
    select: { id: true },
  });
  if (claimed.length === 0) return 0;
  const claimedIds = new Set(claimed.map(({ id }) => id));
  const recipients = new Set(
    entries
      .filter(({ id }) => claimedIds.has(id))
      .map(({ patient }) => patient.userId),
  );

  const doctor = await db.doctor.findUnique({
    where: { id: slot.doctorId },
    select: { user: { select: { name: true } } },
  });
  const when = slot.startDatetime.toLocaleString('pt-BR', {
    timeZone: CLINIC_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  });

  await db.notification.createMany({
    data: Array.from(recipients, (userId) => ({
      userId,
      type: 'vaga_liberada',
      title: 'Um horário foi liberado',
      message: `Abriu uma vaga em ${when}${
        doctor ? ` com ${doctor.user.name}` : ''
      }. Solicite o agendamento antes que seja preenchida.`,
    })),
  });
  return recipients.size;
}
