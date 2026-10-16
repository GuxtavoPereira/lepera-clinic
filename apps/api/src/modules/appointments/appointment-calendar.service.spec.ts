import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@lepera/db';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentCalendarService } from './appointment-calendar.service';

const query = { from: '2026-10-19', to: '2026-10-20' };
const patient = { sub: 'patient-user', role: 'PATIENT' as const };
const doctor = { sub: 'doctor-user', role: 'DOCTOR' as const };
const reception = { sub: 'reception-user', role: 'RECEPTIONIST' as const };
const doctorWithHours = {
  id: 'doctor-1',
  user: { name: 'Profissional A' },
  availabilities: [{ dayOfWeek: 1, startTime: '08:00', endTime: '10:00' }],
};
const row = {
  id: 'appointment-1',
  doctorId: 'doctor-1',
  startDatetime: new Date('2026-10-19T11:00:00Z'),
  endDatetime: new Date('2026-10-19T11:50:00Z'),
  status: 'CONFIRMED',
  type: 'SESSION',
  modality: 'IN_PERSON',
  doctor: { user: { name: 'Profissional A' } },
  patient: { user: { name: 'Nome de paciente' } },
  receptionNotes: 'informação privada',
};

describe('AppointmentCalendarService', () => {
  let service: AppointmentCalendarService;
  let appointmentFindMany: jest.Mock;
  let doctorFindMany: jest.Mock;
  let doctorFindUnique: jest.Mock;
  let patientFindUnique: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-19T10:30:00Z'));
    appointmentFindMany = jest.fn().mockResolvedValue([]);
    doctorFindMany = jest.fn().mockResolvedValue([doctorWithHours]);
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    patientFindUnique = jest.fn().mockResolvedValue({ id: 'patient-1' });
    service = new AppointmentCalendarService({
      db: {
        appointment: { findMany: appointmentFindMany },
        doctor: { findMany: doctorFindMany, findUnique: doctorFindUnique },
        patient: { findUnique: patientFindUnique },
      },
    } as unknown as PrismaService);
  });

  afterEach(() => jest.useRealTimers());

  it('patient calendar enforces own profile and omits patient names and private fields', async () => {
    appointmentFindMany.mockResolvedValue([row]);
    const result = await service.calendar(
      { ...query, doctorId: 'doctor-1' },
      patient,
    );
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('patient');
    expect(result.items[0]).not.toHaveProperty('receptionNotes');
    expect(JSON.stringify(result)).not.toContain('Nome de paciente');
    const [args] = appointmentFindMany.mock.calls[0] as [
      Prisma.AppointmentFindManyArgs,
    ];
    expect(args.where).toEqual({
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      startDatetime: { lt: new Date('2026-10-20T03:00:00Z') },
      endDatetime: { gt: new Date('2026-10-19T03:00:00Z') },
    });
    expect(args.select).not.toHaveProperty('patient');
    expect(patientFindUnique).toHaveBeenCalledWith({
      where: { userId: patient.sub },
      select: { id: true },
    });
  });

  it.each(['ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'] as const)(
    'staff %s sees names without private data',
    async (role) => {
      appointmentFindMany.mockResolvedValue([row]);
      const result = await service.calendar(query, { sub: 'staff', role });
      expect(result.items[0]).toHaveProperty(
        'patient.user.name',
        'Nome de paciente',
      );
      expect(result.items[0]).not.toHaveProperty('receptionNotes');
      const [args] = appointmentFindMany.mock.calls[0] as [
        Prisma.AppointmentFindManyArgs,
      ];
      expect(args.where).not.toHaveProperty('patientId');
      expect(args.where).not.toHaveProperty('doctorId');
    },
  );

  it('doctor calendar forces own doctor profile and can see patient names', async () => {
    appointmentFindMany.mockResolvedValue([row]);
    const result = await service.calendar(query, doctor);
    expect(result.items[0]).toHaveProperty(
      'patient.user.name',
      'Nome de paciente',
    );
    const [args] = appointmentFindMany.mock.calls[0] as [
      Prisma.AppointmentFindManyArgs,
    ];
    expect(args.where).toHaveProperty('doctorId', 'doctor-1');
  });

  it('doctor cannot inspect another professional through either endpoint', async () => {
    await expect(
      service.calendar({ ...query, doctorId: 'other' }, doctor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.availableSlots({ ...query, doctorId: 'other' }, doctor),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(appointmentFindMany).not.toHaveBeenCalled();
    expect(doctorFindMany).not.toHaveBeenCalled();
  });

  it('missing patient profile cannot fall through to all appointments', async () => {
    patientFindUnique.mockResolvedValue(null);
    await expect(service.calendar(query, patient)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(appointmentFindMany).not.toHaveBeenCalled();
  });

  it('generates full 50-minute future slots in the clinic timezone', async () => {
    expect(await service.availableSlots(query, patient)).toEqual({
      items: [
        {
          doctorId: 'doctor-1',
          doctorName: 'Profissional A',
          start: '2026-10-19T11:00:00.000Z',
          end: '2026-10-19T11:50:00.000Z',
        },
        {
          doctorId: 'doctor-1',
          doctorName: 'Profissional A',
          start: '2026-10-19T11:50:00.000Z',
          end: '2026-10-19T12:40:00.000Z',
        },
      ],
    });
    const [args] = doctorFindMany.mock.calls[0] as [Prisma.DoctorFindManyArgs];
    expect(args.where).toEqual({
      user: { isActive: true },
      availabilities: { some: { isActive: true } },
    });
  });

  it('blocks professional overlaps but allows a slot ending when the next starts', async () => {
    appointmentFindMany.mockResolvedValue([
      {
        doctorId: 'doctor-1',
        patientId: 'other-patient',
        startDatetime: new Date('2026-10-19T11:50:00Z'),
        endDatetime: new Date('2026-10-19T12:40:00Z'),
      },
    ]);
    const result = await service.availableSlots(query, reception);
    expect(result.items.map((slot) => slot.start)).toEqual([
      '2026-10-19T11:00:00.000Z',
    ]);
    const [args] = appointmentFindMany.mock.calls[0] as [
      Prisma.AppointmentFindManyArgs,
    ];
    expect(args.where).toHaveProperty('status', {
      notIn: ['CANCELLED', 'RESCHEDULED'],
    });
    expect(args.select).toEqual({
      doctorId: true,
      patientId: true,
      startDatetime: true,
      endDatetime: true,
    });
    expect(JSON.stringify(result)).not.toContain('other-patient');
  });

  it('blocks the patient own overlap even with a different professional', async () => {
    appointmentFindMany.mockResolvedValue([
      {
        doctorId: 'other-doctor',
        patientId: 'patient-1',
        startDatetime: new Date('2026-10-19T10:45:00Z'),
        endDatetime: new Date('2026-10-19T11:50:00Z'),
      },
    ]);
    const result = await service.availableSlots(
      { ...query, doctorId: 'doctor-1' },
      patient,
    );
    expect(result.items.map((slot) => slot.start)).toEqual([
      '2026-10-19T11:50:00.000Z',
    ]);
    const [args] = appointmentFindMany.mock.calls[0] as [
      Prisma.AppointmentFindManyArgs,
    ];
    expect(args.where).toHaveProperty('OR', [
      { doctorId: { in: ['doctor-1'] } },
      { patientId: 'patient-1' },
    ]);
  });

  it('omits slots already started and never invents a partial interval at the end', async () => {
    jest.setSystemTime(new Date('2026-10-19T11:01:00Z'));
    const result = await service.availableSlots(query, patient);
    expect(result.items.map((slot) => slot.start)).toEqual([
      '2026-10-19T11:50:00.000Z',
    ]);
  });

  it('returns no available slots for an expired range', async () => {
    jest.setSystemTime(new Date('2026-10-21T12:00:00Z'));
    expect(await service.availableSlots(query, patient)).toEqual({ items: [] });
  });

  it('does not invent hours for doctors without active availability', async () => {
    doctorFindMany.mockResolvedValue([
      { ...doctorWithHours, availabilities: [] },
    ]);
    expect(await service.availableSlots(query, reception)).toEqual({
      items: [],
    });
    doctorFindMany.mockResolvedValue([]);
    expect(await service.availableSlots(query, reception)).toEqual({
      items: [],
    });
  });

  it('doctor slots query uses only own doctor profile', async () => {
    await service.availableSlots(query, doctor);
    const [args] = doctorFindMany.mock.calls[0] as [Prisma.DoctorFindManyArgs];
    expect(args.where).toHaveProperty('id', 'doctor-1');
  });

  it('deduplicates identical active windows', async () => {
    doctorFindMany.mockResolvedValue([
      {
        ...doctorWithHours,
        availabilities: [
          ...doctorWithHours.availabilities,
          ...doctorWithHours.availabilities,
        ],
      },
    ]);
    expect((await service.availableSlots(query, reception)).items).toHaveLength(
      2,
    );
  });
});
