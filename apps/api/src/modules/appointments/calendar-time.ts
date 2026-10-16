import { BadRequestException } from '@nestjs/common';
import { CLINIC_TIMEZONE } from '../availability/availability.check';
import type { CalendarQueryDto } from './dto/calendar-query.dto';

export const DAY_MS = 86_400_000;
export const CALENDAR_MAX_DAYS = 42;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const clinicFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function civilDate(value: string): number {
  if (typeof value !== 'string' || !DATE_KEY.test(value)) {
    throw new BadRequestException('Informe datas no formato AAAA-MM-DD');
  }
  const instant = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(instant) ||
    new Date(instant).toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException('Data de calendário inválida');
  }
  return instant;
}

/** Convert clinic wall-clock time with Intl; never use the server timezone. */
export function clinicInstant(dateKey: string, minutes = 0): Date {
  const desired = civilDate(dateKey) + minutes * 60_000;
  let guess = desired;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = clinicFormatter.formatToParts(new Date(guess));
    const part = (name: string) =>
      parts.find((item) => item.type === name)?.value ?? '';
    const observed =
      Date.parse(
        `${part('year')}-${part('month')}-${part('day')}T00:00:00.000Z`,
      ) +
      (Number(part('hour')) * 60 + Number(part('minute'))) * 60_000;
    const correction = desired - observed;
    if (correction === 0) return new Date(guess);
    guess += correction;
  }
  throw new BadRequestException('Horário inexistente no fuso da clínica');
}

export function calendarRange(query: CalendarQueryDto) {
  const firstDay = civilDate(query.from);
  const lastDay = civilDate(query.to);
  const days = (lastDay - firstDay) / DAY_MS;
  if (days <= 0 || days > CALENDAR_MAX_DAYS) {
    throw new BadRequestException(
      'O período deve ter entre 1 e 42 dias; to é exclusivo',
    );
  }
  return {
    firstDay,
    lastDay,
    from: clinicInstant(query.from),
    to: clinicInstant(query.to),
  };
}
