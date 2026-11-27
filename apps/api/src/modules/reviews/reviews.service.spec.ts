import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService (CLI-02)', () => {
  const patientActor: AuthUser = { sub: 'user-pat-1', role: 'PATIENT' };
  let auditLog: jest.Mock;

  beforeEach(() => {
    auditLog = jest.fn().mockResolvedValue(undefined);
  });

  it('retorna 404 para consulta de outro paciente (isolamento cruzado)', async () => {
    const prisma = {
      db: {
        patient: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-1' }) },
        appointment: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    } as unknown as PrismaService;
    const service = new ReviewsService(prisma, {
      log: auditLog,
    } as unknown as AuditService);

    await expect(
      service.getForAppointment('appt-other', patientActor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('recusa avaliação de consulta ainda não realizada (400)', async () => {
    const tx = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'appt-1',
          doctorId: 'doc-1',
          status: 'CONFIRMED',
          review: null,
        }),
      },
    };
    const prisma = {
      db: {
        patient: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-1' }) },
        $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      },
    } as unknown as PrismaService;
    const service = new ReviewsService(prisma, {
      log: auditLog,
    } as unknown as AuditService);

    await expect(
      service.create('appt-1', { rating: 5, comment: 'Ótimo' }, patientActor),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('recusa avaliação duplicada na mesma consulta (409)', async () => {
    const tx = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'appt-1',
          doctorId: 'doc-1',
          status: 'COMPLETED',
          review: { id: 'rev-existing' },
        }),
      },
    };
    const prisma = {
      db: {
        patient: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-1' }) },
        $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      },
    } as unknown as PrismaService;
    const service = new ReviewsService(prisma, {
      log: auditLog,
    } as unknown as AuditService);

    await expect(
      service.create('appt-1', { rating: 4 }, patientActor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('cria avaliação válida para consulta COMPLETED e audita', async () => {
    const createReview = jest.fn().mockResolvedValue({
      id: 'rev-1',
      appointmentId: 'appt-1',
      rating: 5,
      comment: 'Excelente acolhimento',
      createdAt: new Date(),
    });
    const tx = {
      appointment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'appt-1',
          doctorId: 'doc-1',
          status: 'COMPLETED',
          review: null,
        }),
      },
      review: { create: createReview },
    };
    const prisma = {
      db: {
        patient: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-1' }) },
        $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      },
    } as unknown as PrismaService;
    const service = new ReviewsService(prisma, {
      log: auditLog,
    } as unknown as AuditService);

    const res = await service.create(
      'appt-1',
      { rating: 5, comment: 'Excelente acolhimento' },
      patientActor,
    );

    expect(res.rating).toBe(5);
    expect(createReview).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appointmentId: 'appt-1',
          patientId: 'pat-1',
          doctorId: 'doc-1',
          rating: 5,
        }) as unknown,
      }),
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'review.create' }),
      tx,
    );
  });
});
