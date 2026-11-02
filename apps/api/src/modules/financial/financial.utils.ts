import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@lepera/db';

/** Datas financeiras são dias civis, não instantes dependentes do servidor. */
export function financialDate(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('Informe uma data no formato AAAA-MM-DD');
  }
  const result = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(result.getTime()) ||
    result.toISOString().slice(0, 10) !== value ||
    result.getUTCFullYear() < 1900
  ) {
    throw new BadRequestException('Data financeira inválida');
  }
  return result;
}

export function financialToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (name: string) =>
    parts.find((item) => item.type === name)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function financialAmount(value: string): Prisma.Decimal {
  if (
    typeof value !== 'string' ||
    !/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(value)
  ) {
    throw new BadRequestException(
      'O valor deve ter até 8 dígitos inteiros e duas casas decimais',
    );
  }
  const amount = new Prisma.Decimal(value);
  if (amount.lte(0)) {
    throw new BadRequestException('O valor precisa ser maior que zero');
  }
  return amount;
}

export function financialRange(from: string, to: string) {
  const start = financialDate(from);
  const end = financialDate(to);
  const days = (end.getTime() - start.getTime()) / 86_400_000;
  if (days < 0 || days >= 366) {
    throw new BadRequestException('Selecione um período de até 366 dias');
  }
  return { gte: start, lte: end };
}
