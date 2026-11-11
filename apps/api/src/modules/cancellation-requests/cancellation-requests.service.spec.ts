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
  let requestUpdateManyAndReturn: jest.Mock;
  let notificationCreate: jest.Mock;
  let notificationCreateMany: jest.Mock;
  let auditLog: jest.Mock;
  let waitlistFindMany: jest.Mock;

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
    requestUpdateManyAndReturn = jest
      .fn()
      .mockResolvedValue([{ id: 'req-1', status: 'APPROVED' }]);
    notificationCreate = jest.fn().mockResolvedValue({});
    notificationCreateMany = jest.fn().mockResolvedValue({ count: 2 });
    auditLog = jest.fn().mockResolvedValue({});
    waitlistFindMany = jest.fn().mockResolvedValue([]);

    const db = {
      doctor: { findUnique: doctorFindUnique },
      receptionist: { findUnique: receptionistFindUnique },
      appointment: {
        findUnique: appointmentFindUnique,
        updateMany: appointmentUpdateMany,
      },
      waitlist: { findMany: waitlistFindMany },
      notification: {
        create: notificationCreate,
        createMany: notificationCreateMany,
      },
      cancellationRequest: {
        create: requestCreate,
        findFirst: requestFindFirst,
        findUnique: requestFindUnique,
        updateManyAndReturn: requestUpdateManyAndReturn,
      },
      $transaction: jest.fn(
        (callback: (client: unknown) => Promise<unknown>): Promise<unknown> =>
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
        requestedBy: { userId: 'doctor-user' },
        appointment: {
          doctorId: 'doctor-1',
          startDatetime: new Date(Date.now() + 48 * HOUR),
          patient: { userId: 'patient-user' },
        },
      });
    });

    it('avisa a lista de espera quando a vaga é liberada', async () => {
      await service.approve('req-1', {}, receptionUser);

      expect(waitlistFindMany).toHaveBeenCalledTimes(1);
    });

    it('cancela a consulta e marca o pedido como aprovado', async () => {
      await expect(
        service.approve('req-1', {}, receptionUser),
      ).resolves.toEqual({
        id: 'req-1',
        status: 'APPROVED',
      });

      expect(appointmentUpdateMany).toHaveBeenCalledWith({
        where: {
          id: 'appointment-1',
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED', cancelReason: 'Atestado' },
      });
      expect(requestUpdateManyAndReturn).toHaveBeenCalledWith({
        where: { id: 'req-1', status: 'PENDING' },
        data: expect.objectContaining({
          status: 'APPROVED',
          reviewedById: 'rec-1',
        }) as unknown,
      });
      expect(notificationCreateMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'patient-user',
            type: 'consulta_cancelada',
            title: 'Consulta cancelada',
            message:
              'Uma consulta foi cancelada. Consulte sua agenda para ver os detalhes.',
          },
          {
            userId: 'doctor-user',
            type: 'cancelamento_aprovado',
            title: 'Pedido de cancelamento aprovado',
            message: 'A recepção aprovou seu pedido. Consulte sua agenda.',
          },
        ],
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
      expect(requestUpdateManyAndReturn).not.toHaveBeenCalled();
      expect(notificationCreateMany).not.toHaveBeenCalled();
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
      expect(requestUpdateManyAndReturn).toHaveBeenCalledTimes(1);
    });

    it('não notifica quando uma revisão concorrente já decidiu o pedido', async () => {
      requestUpdateManyAndReturn.mockResolvedValue([]);

      await expect(
        service.approve('req-1', {}, receptionUser),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(notificationCreateMany).not.toHaveBeenCalled();
      expect(waitlistFindMany).not.toHaveBeenCalled();
      expect(auditLog).not.toHaveBeenCalled();
    });
  });

  describe('reject (recepção)', () => {
    it('recusa com justificativa e audita', async () => {
      requestUpdateManyAndReturn.mockResolvedValue([
        {
          id: 'req-1',
          status: 'REJECTED',
          requestedBy: { userId: 'doctor-user' },
        },
      ]);
      await expect(
        service.reject('req-1', { note: ' Sem substituto ' }, receptionUser),
      ).resolves.toEqual({ id: 'req-1', status: 'REJECTED' });

      expect(requestUpdateManyAndReturn).toHaveBeenCalledWith({
        where: { id: 'req-1', status: 'PENDING' },
        data: expect.objectContaining({
          status: 'REJECTED',
          reviewNote: 'Sem substituto',
        }) as unknown,
        include: { requestedBy: { select: { userId: true } } },
      });
      expect(notificationCreate).toHaveBeenCalledWith({
        data: {
          userId: 'doctor-user',
          type: 'cancelamento_recusado',
          title: 'Pedido de cancelamento recusado',
          message: 'A recepção recusou seu pedido. Consulte sua agenda.',
        },
      });
      expect(auditLog).toHaveBeenCalledTimes(1);
    });

    it('404 se o pedido não existe e 409 se já foi analisado', async () => {
      requestUpdateManyAndReturn.mockResolvedValue([]);

      requestFindUnique.mockResolvedValue(null);
      await expect(
        service.reject('nope', { note: 'ok ok' }, receptionUser),
      ).rejects.toBeInstanceOf(NotFoundException);

      requestFindUnique.mockResolvedValue({ id: 'req-1' });
      await expect(
        service.reject('req-1', { note: 'ok ok' }, receptionUser),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(notificationCreate).not.toHaveBeenCalled();
    });
  });
});
