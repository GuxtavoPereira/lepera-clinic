import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CancellationRequestsService } from './cancellation-requests.service';

describe('CancellationRequestsService', () => {
  const HOUR = 3_600_000;
  const doctorUser = { sub: 'doctor-user', role: 'DOCTOR' as const };
  const receptionUser = {
    sub: 'reception-user',
    role: 'RECEPTIONIST' as const,
  };

  let service: CancellationRequestsService;
  let doctorFindUnique: jest.Mock;
  let receptionistFindUnique: jest.Mock;
  let appointmentFindUnique: jest.Mock;
  let appointmentUpdateMany: jest.Mock;
  let requestCreate: jest.Mock;
  let requestFindFirst: jest.Mock;
  let requestFindUnique: jest.Mock;
  let requestUpdate: jest.Mock;
  let requestUpdateMany: jest.Mock;
  let auditLog: jest.Mock;

  function appointment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'appointment-1',
      doctorId: 'doctor-1',
      status: 'SCHEDULED',
      startDatetime: new Date(Date.now() + 48 * HOUR),
      ...overrides,
    };
  }

  beforeEach(() => {
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    receptionistFindUnique = jest.fn().mockResolvedValue({ id: 'rec-1' });
    appointmentFindUnique = jest.fn().mockResolvedValue(appointment());
    appointmentUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    requestCreate = jest.fn().mockResolvedValue({ id: 'req-1' });
    requestFindFirst = jest.fn().mockResolvedValue(null);
    requestFindUnique = jest.fn();
    requestUpdate = jest
      .fn()
      .mockResolvedValue({ id: 'req-1', status: 'APPROVED' });
    requestUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    auditLog = jest.fn().mockResolvedValue({});

    const db = {
      doctor: { findUnique: doctorFindUnique },
      receptionist: { findUnique: receptionistFindUnique },
      appointment: {
        findUnique: appointmentFindUnique,
        updateMany: appointmentUpdateMany,
      },
      cancellationRequest: {
        create: requestCreate,
        findFirst: requestFindFirst,
        findUnique: requestFindUnique,
        update: requestUpdate,
        updateMany: requestUpdateMany,
      },
      $transaction: jest.fn((callback: (client: unknown) => Promise<unknown>) =>
        callback(db),
      ),
    };

    service = new CancellationRequestsService(
      { db } as unknown as PrismaService,
      { log: auditLog } as unknown as AuditService,
    );
  });

  describe('create (médico pede)', () => {
    it('registra o pedido para consulta futura própria e audita', async () => {
      await service.create(
        { appointmentId: 'appointment-1', reason: '  Estarei de atestado  ' },
        doctorUser,
      );

      expect(requestCreate).toHaveBeenCalledWith({
        data: {
          appointmentId: 'appointment-1',
          requestedById: 'doctor-1',
          reason: 'Estarei de atestado',
        },
      });
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'cancellation_request.create' }),
        expect.anything(),
      );
    });

    it('consulta de outro profissional responde 404', async () => {
      appointmentFindUnique.mockResolvedValue(
        appointment({ doctorId: 'doctor-2' }),
      );

      await expect(
        service.create(
          { appointmentId: 'appointment-1', reason: 'Motivo válido' },
          doctorUser,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(requestCreate).not.toHaveBeenCalled();
    });

    it('recusa consulta que já começou/passou', async () => {
      appointmentFindUnique.mockResolvedValue(
        appointment({ startDatetime: new Date(Date.now() - HOUR) }),
      );

      await expect(
        service.create(
          { appointmentId: 'appointment-1', reason: 'Motivo válido' },
          doctorUser,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa consulta que não está mais cancelável', async () => {
      appointmentFindUnique.mockResolvedValue(
        appointment({ status: 'COMPLETED' }),
      );

      await expect(
        service.create(
          { appointmentId: 'appointment-1', reason: 'Motivo válido' },
          doctorUser,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('recusa pedido duplicado enquanto houver um pendente', async () => {
      requestFindFirst.mockResolvedValue({ id: 'req-0' });

      await expect(
        service.create(
          { appointmentId: 'appointment-1', reason: 'Motivo válido' },
          doctorUser,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(requestCreate).not.toHaveBeenCalled();
    });
  });

  describe('approve (recepção)', () => {
    beforeEach(() => {
      requestFindUnique.mockResolvedValue({
        id: 'req-1',
        status: 'PENDING',
        appointmentId: 'appointment-1',
        reason: 'Atestado',
      });
    });

    it('cancela a consulta e marca o pedido como aprovado', async () => {
      await service.approve('req-1', {}, receptionUser);

      expect(appointmentUpdateMany).toHaveBeenCalledWith({
        where: {
          id: 'appointment-1',
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED', cancelReason: 'Atestado' },
      });
      expect(requestUpdate).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          reviewedById: 'rec-1',
        }),
      });
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'cancellation_request.approve' }),
        expect.anything(),
      );
    });

    it('conflito se a consulta já não pode ser cancelada', async () => {
      appointmentUpdateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.approve('req-1', {}, receptionUser),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(requestUpdate).not.toHaveBeenCalled();
    });

    it('conflito se o pedido já foi analisado', async () => {
      requestFindUnique.mockResolvedValue({
        id: 'req-1',
        status: 'REJECTED',
        appointmentId: 'appointment-1',
        reason: 'Atestado',
      });

      await expect(
        service.approve('req-1', {}, receptionUser),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(appointmentUpdateMany).not.toHaveBeenCalled();
    });

    it('super admin aprova sem perfil de recepção', async () => {
      await service.approve('req-1', {}, { sub: 's', role: 'SUPER_ADMIN' });

      expect(receptionistFindUnique).not.toHaveBeenCalled();
      expect(requestUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('reject (recepção)', () => {
    it('recusa com justificativa e audita', async () => {
      requestFindUnique.mockResolvedValue({ id: 'req-1', status: 'REJECTED' });

      await service.reject(
        'req-1',
        { note: ' Sem substituto ' },
        receptionUser,
      );

      expect(requestUpdateMany).toHaveBeenCalledWith({
        where: { id: 'req-1', status: 'PENDING' },
        data: expect.objectContaining({
          status: 'REJECTED',
          reviewNote: 'Sem substituto',
        }),
      });
      expect(auditLog).toHaveBeenCalledTimes(1);
    });

    it('404 se o pedido não existe e 409 se já foi analisado', async () => {
      requestUpdateMany.mockResolvedValue({ count: 0 });

      requestFindUnique.mockResolvedValue(null);
      await expect(
        service.reject('nope', { note: 'ok ok' }, receptionUser),
      ).rejects.toBeInstanceOf(NotFoundException);

      requestFindUnique.mockResolvedValue({ id: 'req-1' });
      await expect(
        service.reject('req-1', { note: 'ok ok' }, receptionUser),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
