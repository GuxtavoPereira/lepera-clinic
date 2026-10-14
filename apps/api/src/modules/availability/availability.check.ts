import { BadRequestException } from '@nestjs/common';
import type { DbClient } from '../../prisma/prisma.types';

/** A clínica fica em Caraguatatuba (SP). Os horários de atendimento são
 *  "HH:MM" no fuso da clínica; o banco guarda as consultas em UTC. */
export const CLINIC_TIMEZONE = 'America/Sao_Paulo';

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Dia da semana (0=domingo), minutos desde 00:00 e data (AAAA-MM-DD), no
 *  fuso da clínica. */
export function toClinicTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';

  return {
    day: WEEKDAYS[get('weekday')],
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
  };
}

export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * A consulta precisa caber inteira num horário de atendimento do profissional.
 * Profissional SEM horários cadastrados não tem restrição (compatível com
 * quem ainda não preencheu a disponibilidade).
 */
export async function assertWithinAvailability(
  db: DbClient,
  doctorId: string,
  start: Date,
  end: Date,
) {
  const slots = await db.doctorAvailability.findMany({
    where: { doctorId, isActive: true },
    select: { dayOfWeek: true, startTime: true, endTime: true },
  });
  if (slots.length === 0) return;

  const from = toClinicTime(start);
  const to = toClinicTime(end);

  const fits =
    from.dateKey === to.dateKey &&
    slots.some(
      (slot) =>
        slot.dayOfWeek === from.day &&
        toMinutes(slot.startTime) <= from.minutes &&
        to.minutes <= toMinutes(slot.endTime),
    );

  if (!fits) {
    throw new BadRequestException(
      'O profissional não atende neste dia/horário. Confira a disponibilidade dele ou marque como encaixe.',
    );
  }
}
