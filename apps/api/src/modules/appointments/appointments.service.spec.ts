import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@lepera/db';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  const dto = {
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startDatetime: '2026-10-08T10:00:00.000Z',
    durationMinutes: 50,
    modality: 'ONLINE' as const,
    type: 'SESSION' as const,
  };
  const appointment = {
    id: 'appointment-1',
    ...dto,
    startDatetime: new Date(dto.startDatetime),
    endDatetime: new Date('2026-10-08T10:50:00.000Z'),
    status: 'SCHEDULED',
  };

  let service: AppointmentsService;
  let patientFindUnique: jest.Mock;
  let doctorFindUnique: jest.Mock;
  let receptionistFindUnique: jest.Mock;
  let appointmentFindFirst: jest.Mock;
  let appointmentCreate: jest.Mock;
  let transaction: jest.Mock;
  let patientForUserFindUnique: jest.Mock;
  let doctorForUserFindUnique: jest.Mock;
  let appointmentFindMany: jest.Mock;

  beforeEach(async () => {
    patientFindUnique = jest.fn().mockResolvedValue({ id: dto.patientId });
    doctorFindUnique = jest.fn().mockResolvedValue({ id: dto.doctorId });
    receptionistFindUnique = jest
      .fn()
      .mockResolvedValue({ id: 'receptionist-1' });
    appointmentFindFirst = jest.fn().mockResolvedValue(null);
    appointmentCreate = jest.fn().mockResolvedValue(appointment);
    patientForUserFindUnique = jest
      .fn()
      .mockResolvedValue({ id: dto.patientId });
    doctorForUserFindUnique = jest.fn().mockResolvedValue({ id: dto.doctorId });
    appointmentFindMany = jest.fn().mockResolvedValue([appointment]);

    const tx = {
      patient: { findUnique: patientFindUnique },
      doctor: { findUnique: doctorFindUnique },
      receptionist: { findUnique: receptionistFindUnique },
      appointment: {
        findFirst: appointmentFindFirst,
        create: appointmentCreate,
      },
    };
    transaction = jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    const module = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: PrismaService,
          useValue: {
            db: {
              $transaction: transaction,
              patient: { findUnique: patientForUserFindUnique },
              doctor: { findUnique: doctorForUserFindUnique },
              appointment: {
                findMany: appointmentFindMany,
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  it('creates an appointment with calculated end time and receptionist profile', async () => {
    await expect(
      service.create(dto, { sub: 'user-1', role: 'RECEPTIONIST' }),
    ).resolves.toEqual(appointment);

    expect(appointmentCreate).toHaveBeenCalledWith({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        receptionistId: 'receptionist-1',
        startDatetime: new Date(dto.startDatetime),
        endDatetime: new Date('2026-10-08T10:50:00.000Z'),
        durationMinutes: dto.durationMinutes,
        modality: dto.modality,
        type: dto.type,
        roomOrLink: undefined,
        receptionNotes: undefined,
      },
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('rejects an appointment that overlaps an existing appointment', async () => {
    appointmentFindFirst.mockResolvedValue({ id: 'existing-appointment' });

    await expect(
      service.create(dto, { sub: 'admin-1', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(appointmentCreate).not.toHaveBeenCalled();
  });

  it('lists the authenticated patient appointments with current statuses', async () => {
    await expect(
      service.findMine({ sub: 'patient-user-1', role: 'PATIENT' }),
    ).resolves.toEqual([appointment]);

    expect(patientForUserFindUnique).toHaveBeenCalledWith({
      where: { userId: 'patient-user-1' },
      select: { id: true },
    });
    expect(appointmentFindMany).toHaveBeenCalledWith({
      where: { patientId: dto.patientId },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startDatetime: 'desc' },
    });
  });

  it('lists only the authenticated doctor appointments with patient names', async () => {
    await expect(
      service.findMine({ sub: 'doctor-user-1', role: 'DOCTOR' }),
    ).resolves.toEqual([appointment]);

    expect(doctorForUserFindUnique).toHaveBeenCalledWith({
      where: { userId: 'doctor-user-1' },
      select: { id: true },
    });
    expect(appointmentFindMany).toHaveBeenCalledWith({
      where: { doctorId: dto.doctorId },
      include: {
        patient: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startDatetime: 'asc' },
    });
  });
});
