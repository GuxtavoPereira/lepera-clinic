import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AvailabilityService, validateSlots } from './availability.service';

describe('validateSlots', () => {
  it('aceita faixas válidas e em dias diferentes', () => {
    expect(() =>
      validateSlots([
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '14:00', endTime: '18:00' },
        { dayOfWeek: 3, startTime: '08:00', endTime: '12:00' },
      ]),
    ).not.toThrow();
  });

  it('aceita faixas coladas (12:00 termina e 12:00 começa)', () => {
    expect(() =>
      validateSlots([
        { dayOfWeek: 1, startTime: '08:00', endTime: '12:00' },
        { dayOfWeek: 1, startTime: '12:00', endTime: '14:00' },
      ]),
    ).not.toThrow();
  });

  it('recusa fim antes ou igual ao início', () => {
    expect(() =>
      validateSlots([{ dayOfWeek: 1, startTime: '12:00', endTime: '12:00' }]),
    ).toThrow(BadRequestException);
    expect(() =>
      validateSlots([{ dayOfWeek: 1, startTime: '14:00', endTime: '08:00' }]),
    ).toThrow(BadRequestException);
  });

  it('recusa sobreposição no mesmo dia, mesmo fora de ordem', () => {
    expect(() =>
      validateSlots([
        { dayOfWeek: 2, startTime: '10:00', endTime: '13:00' },
        { dayOfWeek: 2, startTime: '08:00', endTime: '11:00' },
      ]),
    ).toThrow('sobrepostos em terça-feira');
  });
});

describe('AvailabilityService.replaceMine', () => {
  it('substitui a grade, audita e devolve a nova lista', async () => {
    const deleteMany = jest.fn().mockResolvedValue({});
    const createMany = jest.fn().mockResolvedValue({});
    const findMany = jest.fn().mockResolvedValue([{ id: 'a1' }]);
    const auditLog = jest.fn().mockResolvedValue({});
    const db = {
      doctor: { findUnique: jest.fn().mockResolvedValue({ id: 'doctor-1' }) },
      doctorAvailability: { deleteMany, createMany, findMany },
      $transaction: jest.fn(
        (cb: (client: unknown) => Promise<unknown>): Promise<unknown> => cb(db),
      ),
    };
    const service = new AvailabilityService(
      { db } as unknown as PrismaService,
      { log: auditLog } as unknown as AuditService,
    );

    const result = await service.replaceMine(
      { sub: 'doctor-user', role: 'DOCTOR' },
      { slots: [{ dayOfWeek: 1, startTime: '08:00', endTime: '12:00' }] },
    );

    expect(deleteMany).toHaveBeenCalledWith({
      where: { doctorId: 'doctor-1' },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          doctorId: 'doctor-1',
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '12:00',
        },
      ],
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'availability.update' }),
      expect.anything(),
    );
    expect(result).toEqual([{ id: 'a1' }]);
  });

  it('grade inválida não toca no banco', async () => {
    const transaction = jest.fn();
    const service = new AvailabilityService(
      { db: { $transaction: transaction } } as unknown as PrismaService,
      {} as AuditService,
    );

    await expect(
      service.replaceMine(
        { sub: 'u', role: 'DOCTOR' },
        { slots: [{ dayOfWeek: 1, startTime: '12:00', endTime: '08:00' }] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
