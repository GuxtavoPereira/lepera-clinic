import { BadRequestException } from '@nestjs/common';

/** "2026-10-08" → Date ao meio-dia UTC (evita virar o dia por fuso horário). */
export function parseDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
}

/** Valida e converte a data de nascimento: existente, não futura, ≥ 1900. */
export function parseBirthDate(value: string, now = new Date()): Date {
  const date = parseDateOnly(value);
  const today = now.toISOString().slice(0, 10);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value.slice(0, 10) || // ex.: 31/02
    value.slice(0, 10) > today ||
    date.getUTCFullYear() < 1900
  ) {
    throw new BadRequestException('Data de nascimento inválida');
  }

  return date;
}

export function ageInYears(birth: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const months = now.getUTCMonth() - birth.getUTCMonth();
  if (months < 0 || (months === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}
