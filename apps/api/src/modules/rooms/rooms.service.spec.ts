import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomsService } from './rooms.service';

describe('RoomsService (PRI-08)', () => {
  const doctorA: AuthUser = { sub: 'doc-a', role: 'DOCTOR' };
  const doctorB: AuthUser = { sub: 'doc-b', role: 'DOCTOR' };
  const reception: AuthUser = { sub: 'rec-1', role: 'RECEPTIONIST' };

  let service: RoomsService;
  let clinicRoom: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let roomReservation: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let transaction: jest.Mock;
  let auditLog: jest.Mock;

  beforeEach(() => {
    clinicRoom = {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'room-1', name: 'Sala 01', isActive: true }),
      create: jest.fn(),
      update: jest.fn(),
    };
    roomReservation = {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn(),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'res-1', ...data }),
      ),
      update: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'res-1', ...data }),
      ),
    };
    auditLog = jest.fn().mockResolvedValue({});
    const db = {
      clinicRoom,
      roomReservation,
      appointment: { findUnique: jest.fn() },
    };
    transaction = jest.fn((cb: (tx: typeof db) => Promise<unknown>) => cb(db));
    service = new RoomsService(
      { db: { ...db, $transaction: transaction } } as unknown as PrismaService,
      { log: auditLog } as unknown as AuditService,
    );
  });

  it('impede reserva sobreposta no mesmo consultório usando transação Serializable', async () => {
    roomReservation.findFirst.mockResolvedValue({ id: 'existing-res' });
    await expect(
      service.reserve(
        {
          roomId: 'room-1',
          title: 'Atendimento',
          startDatetime: '2026-12-01T13:00:00.000Z',
          endDatetime: '2026-12-01T13:50:00.000Z',
        },
        doctorA,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(roomReservation.create).not.toHaveBeenCalled();
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('converte conflito de serialização (P2034) em 409 Conflict', async () => {
    transaction.mockRejectedValue({ code: 'P2034' });
    await expect(
      service.reserve(
        {
          roomId: 'room-1',
          title: 'Atendimento',
          startDatetime: '2026-12-01T13:00:00.000Z',
          endDatetime: '2026-12-01T13:50:00.000Z',
        },
        doctorA,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('recusa duração inválida (< 15 min) ou sala inativa', async () => {
    await expect(
      service.reserve(
        {
          roomId: 'room-1',
          title: 'Curta',
          startDatetime: '2026-12-01T13:00:00.000Z',
          endDatetime: '2026-12-01T13:10:00.000Z',
        },
        doctorA,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    clinicRoom.findUnique.mockResolvedValue({
      id: 'room-1',
      name: 'Sala 01',
      isActive: false,
    });
    await expect(
      service.reserve(
        {
          roomId: 'room-1',
          title: 'Atendimento',
          startDatetime: '2026-12-01T13:00:00.000Z',
          endDatetime: '2026-12-01T13:50:00.000Z',
        },
        doctorA,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('impede outro profissional de cancelar reserva alheia, mas permite à recepção', async () => {
    roomReservation.findUnique.mockResolvedValue({
      id: 'res-1',
      reservedById: doctorA.sub,
      status: 'CONFIRMED',
      roomId: 'room-1',
    });
    await expect(
      service.cancelReservation('res-1', {}, doctorB),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.cancelReservation(
        'res-1',
        { reason: 'Remanejamento' },
        reception,
      ),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
  });
});
