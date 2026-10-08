import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@lepera/db';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ScheduleRequestsService } from './schedule-requests.service';

describe('ScheduleRequestsService', () => {
  let service: ScheduleRequestsService;
  const patientFindUnique = jest.fn();
  const scheduleRequestCreate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    patientFindUnique.mockResolvedValue({ id: 'patient-1' });
    scheduleRequestCreate.mockResolvedValue({
      id: 'request-1',
      patientId: 'patient-1',
      type: 'novo_paciente',
      status: 'PENDING',
    });

    const module = await Test.createTestingModule({
      providers: [
        ScheduleRequestsService,
        {
          provide: PrismaService,
          useValue: {
            db: {
              patient: { findUnique: patientFindUnique },
              doctor: { findUnique: jest.fn() },
              scheduleRequest: { create: scheduleRequestCreate },
            },
          },
        },
        { provide: AppointmentsService, useValue: {} },
      ],
    }).compile();

    service = module.get(ScheduleRequestsService);
  });

  it('creates a pending request for the authenticated patient', async () => {
    const request = await service.create(
      {
        type: 'novo_paciente',
        preferredShift: 'INDIFFERENT',
      },
      { sub: 'user-1', role: 'PATIENT' },
    );

    expect(patientFindUnique).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true },
    });
    expect(scheduleRequestCreate).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        type: 'novo_paciente',
        preferredDoctorId: undefined,
        preferredDate: undefined,
        preferredShift: 'INDIFFERENT',
        reason: undefined,
      },
      include: {
        preferredDoctor: { include: { user: { select: { name: true } } } },
      },
    });
    expect(request.status).toBe('PENDING');
  });

  it('requires a preferred date or shift', async () => {
    await expect(
      service.create(
        { type: 'novo_paciente' },
        { sub: 'user-1', role: 'PATIENT' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(patientFindUnique).not.toHaveBeenCalled();
  });

  it('creates the appointment and approves the request in one transaction', async () => {
    const requestFindUnique = jest.fn().mockResolvedValue({
      id: 'request-1',
      patientId: 'patient-1',
      status: 'PENDING',
    });
    const requestUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const appointment = { id: 'appointment-1' };
    const createForRequest = jest.fn().mockResolvedValue(appointment);
    const transactionClient = {
      scheduleRequest: {
        findUnique: requestFindUnique,
        updateMany: requestUpdateMany,
      },
    };
    const transaction = jest.fn(
      (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
    );
    const module = await Test.createTestingModule({
      providers: [
        ScheduleRequestsService,
        {
          provide: PrismaService,
          useValue: {
            db: {
              receptionist: {
                findUnique: jest.fn().mockResolvedValue({ id: 'reception-1' }),
              },
              $transaction: transaction,
            },
          },
        },
        {
          provide: AppointmentsService,
          useValue: { createForRequest },
        },
      ],
    }).compile();
    const approvalService = module.get(ScheduleRequestsService);

    await expect(
      approvalService.approve(
        'request-1',
        {
          doctorId: 'doctor-1',
          startDatetime: '2026-10-08T10:00:00.000Z',
          durationMinutes: 50,
        },
        { sub: 'receptionist-user', role: 'RECEPTIONIST' },
      ),
    ).resolves.toEqual({ ...appointment, scheduleRequestId: 'request-1' });

    expect(createForRequest).toHaveBeenCalledWith(
      transactionClient,
      expect.objectContaining({
        patientId: 'patient-1',
        doctorId: 'doctor-1',
        startDatetime: '2026-10-08T10:00:00.000Z',
      }),
      'reception-1',
    );
    expect(requestUpdateMany).toHaveBeenCalledTimes(1);
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });
});
