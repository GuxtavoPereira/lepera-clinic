import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AppointmentsService,
  PATIENT_MIN_CANCEL_HOURS,
} from './appointments.service';

describe('AppointmentsService.cancel (RN03 / CT04)', () => {
  const HOUR = 3_600_000;

  let service: AppointmentsService;
  let appointmentFindUnique: jest.Mock;
  let appointmentUpdateMany: jest.Mock;
  let requestUpdateMany: jest.Mock;
  let patientFindUnique: jest.Mock;

  function appointmentIn(
    hours: number,
    overrides: Record<string, unknown> = {},
  ) {
    return {
      id: 'appointment-1',
      patientId: 'patient-1',
      status: 'SCHEDULED',
      startDatetime: new Date(Date.now() + hours * HOUR),
      ...overrides,
    };
  }

  beforeEach(() => {
    appointmentFindUnique = jest.fn();
    appointmentUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    requestUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    patientFindUnique = jest.fn().mockResolvedValue({ id: 'patient-1' });

    const db = {
      appointment: {
        findUnique: appointmentFindUnique,
        updateMany: appointmentUpdateMany,
      },
      cancellationRequest: { updateMany: requestUpdateMany },
      patient: { findUnique: patientFindUnique },
      $transaction: jest.fn((callback: (client: unknown) => Promise<unknown>) =>
        callback(db),
      ),
    };

    service = new AppointmentsService({ db } as unknown as PrismaService);
  });

  it('recepção cancela e grava status CANCELLED com o motivo', async () => {
    appointmentFindUnique.mockResolvedValue(appointmentIn(2));

    await service.cancel(
      'appointment-1',
      { reason: 'Paciente pediu' },
      { sub: 'user-1', role: 'RECEPTIONIST' },
    );

    expect(appointmentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'appointment-1',
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
      },
      data: { status: 'CANCELLED', cancelReason: 'Paciente pediu' },
    });
  });

  it('encerra os pedidos de cancelamento pendentes da consulta', async () => {
    appointmentFindUnique.mockResolvedValue(appointmentIn(2));

    await service.cancel(
      'appointment-1',
      {},
      { sub: 'u', role: 'RECEPTIONIST' },
    );

    expect(requestUpdateMany).toHaveBeenCalledWith({
      where: { appointmentId: 'appointment-1', status: 'PENDING' },
      data: expect.objectContaining({ status: 'APPROVED' }),
    });
  });

  it('super admin cancela como a recepção', async () => {
    appointmentFindUnique.mockResolvedValue(appointmentIn(1));

    await service.cancel(
      'appointment-1',
      {},
      { sub: 's', role: 'SUPER_ADMIN' },
    );

    expect(appointmentUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('paciente cancela a própria consulta com antecedência suficiente', async () => {
    appointmentFindUnique.mockResolvedValue(
      appointmentIn(PATIENT_MIN_CANCEL_HOURS + 1),
    );

    await service.cancel(
      'appointment-1',
      {},
      { sub: 'patient-user', role: 'PATIENT' },
    );

    expect(patientFindUnique).toHaveBeenCalledWith({
      where: { userId: 'patient-user' },
      select: { id: true },
    });
    expect(appointmentUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('paciente não cancela sem a antecedência mínima', async () => {
    appointmentFindUnique.mockResolvedValue(
      appointmentIn(PATIENT_MIN_CANCEL_HOURS - 1),
    );

    await expect(
      service.cancel(
        'appointment-1',
        {},
        { sub: 'patient-user', role: 'PATIENT' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(appointmentUpdateMany).not.toHaveBeenCalled();
  });

  it('recepção cancela mesmo sem antecedência mínima', async () => {
    appointmentFindUnique.mockResolvedValue(appointmentIn(1));

    await service.cancel(
      'appointment-1',
      {},
      { sub: 'u', role: 'RECEPTIONIST' },
    );

    expect(appointmentUpdateMany).toHaveBeenCalledTimes(1);
  });

  it('paciente não cancela consulta de outro paciente (responde 404)', async () => {
    appointmentFindUnique.mockResolvedValue(
      appointmentIn(72, { patientId: 'patient-2' }),
    );

    await expect(
      service.cancel(
        'appointment-1',
        {},
        { sub: 'patient-user', role: 'PATIENT' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(appointmentUpdateMany).not.toHaveBeenCalled();
  });

  it('médico NÃO cancela direto: deve solicitar à recepção (403)', async () => {
    await expect(
      service.cancel('appointment-1', {}, { sub: 'doc', role: 'DOCTOR' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(appointmentFindUnique).not.toHaveBeenCalled();
    expect(appointmentUpdateMany).not.toHaveBeenCalled();
  });

  it('responde 404 quando a consulta não existe', async () => {
    appointmentFindUnique.mockResolvedValue(null);

    await expect(
      service.cancel('nope', {}, { sub: 'user-1', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each(['CANCELLED', 'COMPLETED', 'RESCHEDULED', 'WAITING'])(
    'não cancela consulta com status %s',
    async (status) => {
      appointmentFindUnique.mockResolvedValue(appointmentIn(72, { status }));

      await expect(
        service.cancel('appointment-1', {}, { sub: 'user-1', role: 'ADMIN' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(appointmentUpdateMany).not.toHaveBeenCalled();
    },
  );

  it('responde conflito se outra requisição cancelou primeiro (corrida)', async () => {
    appointmentFindUnique.mockResolvedValue(appointmentIn(72));
    appointmentUpdateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.cancel('appointment-1', {}, { sub: 'user-1', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(requestUpdateMany).not.toHaveBeenCalled();
  });
});
