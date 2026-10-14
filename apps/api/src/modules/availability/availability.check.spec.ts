import { BadRequestException } from '@nestjs/common';
import type { DbClient } from '../../prisma/prisma.types';
import { assertWithinAvailability, toClinicTime } from './availability.check';

function dbWith(
  slots: { dayOfWeek: number; startTime: string; endTime: string }[],
) {
  return {
    doctorAvailability: { findMany: jest.fn().mockResolvedValue(slots) },
  } as unknown as DbClient;
}

// 12/10/2026 é segunda-feira. São Paulo está em UTC-3 (sem horário de verão).
const MONDAY_MORNING = [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }];

describe('toClinicTime', () => {
  it('converte UTC para o horário de Brasília', () => {
    expect(toClinicTime(new Date('2026-10-12T13:00:00.000Z'))).toEqual({
      day: 1,
      minutes: 10 * 60,
      dateKey: '2026-10-12',
    });
  });

  it('vira o dia e o dia da semana quando passa da meia-noite UTC', () => {
    // 01:00 UTC de segunda = 22:00 de domingo em Brasília
    expect(toClinicTime(new Date('2026-10-12T01:00:00.000Z'))).toEqual({
      day: 0,
      minutes: 22 * 60,
      dateKey: '2026-10-11',
    });
  });
});

describe('assertWithinAvailability', () => {
  const at = (iso: string, minutes = 50) => {
    const start = new Date(iso);
    return { start, end: new Date(start.getTime() + minutes * 60_000) };
  };

  it('aceita consulta dentro do horário (segunda 10:00–10:50)', async () => {
    const { start, end } = at('2026-10-12T13:00:00.000Z');

    await expect(
      assertWithinAvailability(dbWith(MONDAY_MORNING), 'd1', start, end),
    ).resolves.toBeUndefined();
  });

  it('aceita consulta que termina exatamente no fim do expediente', async () => {
    const { start, end } = at('2026-10-12T14:10:00.000Z'); // 11:10–12:00

    await expect(
      assertWithinAvailability(dbWith(MONDAY_MORNING), 'd1', start, end),
    ).resolves.toBeUndefined();
  });

  it('recusa dia em que o profissional não atende', async () => {
    const { start, end } = at('2026-10-13T13:00:00.000Z'); // terça

    await expect(
      assertWithinAvailability(dbWith(MONDAY_MORNING), 'd1', start, end),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa horário fora do expediente e consulta que passa do fim', async () => {
    const early = at('2026-10-12T10:00:00.000Z'); // 07:00
    await expect(
      assertWithinAvailability(
        dbWith(MONDAY_MORNING),
        'd1',
        early.start,
        early.end,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const overrun = at('2026-10-12T14:30:00.000Z'); // 11:30–12:20
    await expect(
      assertWithinAvailability(
        dbWith(MONDAY_MORNING),
        'd1',
        overrun.start,
        overrun.end,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('profissional sem horários cadastrados não tem restrição', async () => {
    const { start, end } = at('2026-10-17T03:00:00.000Z'); // sexta 00:00 de madrugada

    await expect(
      assertWithinAvailability(dbWith([]), 'd1', start, end),
    ).resolves.toBeUndefined();
  });
});
