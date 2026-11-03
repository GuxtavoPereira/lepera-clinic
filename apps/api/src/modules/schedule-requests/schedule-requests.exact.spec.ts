import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@lepera/db';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentCalendarService } from '../appointments/appointment-calendar.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ScheduleRequestsService } from './schedule-requests.service';

describe('Schedule requests: exact slots and concurrency', () => {
  const actor = { sub: 'patient-user', role: 'PATIENT' as const };
  const reviewer = { sub: 'reception-user', role: 'RECEPTIONIST' as const };
  const start = '2099-11-02T11:50:00.000Z';
  let create: jest.Mock;
  let duplicate: jest.Mock;
  let request: jest.Mock;
  let update: jest.Mock;
  let notify: jest.Mock;
  let appt: jest.Mock;
  let free: jest.Mock;
  let transaction: jest.Mock;
  let service: ScheduleRequestsService;
  beforeEach(() => {
    create = jest.fn().mockResolvedValue({ id: 'request' });
    duplicate = jest.fn().mockResolvedValue(null);
    request = jest.fn().mockResolvedValue({
      id: 'request',
      patientId: 'p',
      status: 'PENDING',
      mode: 'EXACT',
      preferredDoctorId: 'd',
      requestedStartDatetime: new Date(start),
      durationMinutes: 50,
      modality: 'ONLINE',
      patient: { userId: 'patient-user' },
    });
    update = jest.fn().mockResolvedValue({ count: 1 });
    notify = jest.fn().mockResolvedValue({});
    appt = jest.fn().mockResolvedValue({ id: 'appointment' });
    free = jest.fn().mockResolvedValue({ items: [{ doctorId: 'd', start }] });
    const tx = {
      scheduleRequest: {
        create,
        findFirst: duplicate,
        findUnique: request,
        updateMany: update,
      },
      notification: { create: notify },
    };
    transaction = jest.fn((cb: (txArg: typeof tx) => Promise<unknown>) =>
      cb(tx),
    );
    service = new ScheduleRequestsService(
      {
        db: {
          $transaction: transaction,
          patient: { findUnique: jest.fn().mockResolvedValue({ id: 'p' }) },
          doctor: {
            findUnique: jest
              .fn()
              .mockResolvedValue({ id: 'd', user: { isActive: true } }),
          },
          receptionist: {
            findUnique: jest.fn().mockResolvedValue({ id: 'r' }),
          },
        },
      } as unknown as PrismaService,
      { createForRequest: appt } as unknown as AppointmentsService,
      { availableSlots: free } as unknown as AppointmentCalendarService,
    );
  });
  const exact = {
    type: 'novo_paciente' as const,
    mode: 'EXACT' as const,
    preferredDoctorId: 'd',
    requestedStartDatetime: start,
    modality: 'ONLINE' as const,
  };
  it('persists the selected slot without trusting a time embedded in a note', async () => {
    await service.create(exact, actor);
    expect(free).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 'd' }),
      actor,
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: 'EXACT',
          requestedStartDatetime: new Date(start),
          durationMinutes: 50,
          preferredDoctorId: 'd',
        }) as unknown,
      }),
    );
  });
  it('rejects stale free slots and duplicate pending exact requests', async () => {
    free.mockResolvedValueOnce({ items: [] });
    await expect(service.create(exact, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    duplicate.mockResolvedValue({ id: 'already' });
    await expect(service.create(exact, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
  });
  it('requires doctor and timezone-aware future time', async () => {
    await expect(
      service.create({ ...exact, preferredDoctorId: undefined }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        { ...exact, requestedStartDatetime: '2099-11-02T11:50:00' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create(
        { ...exact, requestedStartDatetime: '2000-01-01T12:00:00Z' },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('approves an exact request with an empty body using only persisted assignment', async () => {
    await expect(service.approve('request', {}, reviewer)).resolves.toEqual({
      id: 'appointment',
      scheduleRequestId: 'request',
    });
    expect(appt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        patientId: 'p',
        doctorId: 'd',
        startDatetime: start,
        durationMinutes: 50,
        modality: 'ONLINE',
      }),
      'r',
      true,
    );
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: actor.sub }) as unknown,
      }),
    );
  });
  it('rejects overriding an exact request', async () => {
    await expect(
      service.approve('request', { doctorId: 'other' }, reviewer),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.approve('request', { allowOutsideAvailability: true }, reviewer),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(appt).not.toHaveBeenCalled();
  });
  it('never generates a second consultation after review', async () => {
    request.mockResolvedValue({ id: 'request', status: 'APPROVED' });
    await expect(
      service.approve('request', {}, reviewer),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(appt).not.toHaveBeenCalled();
  });
  it('rolls back on compare-and-set or serialization conflict without notifying', async () => {
    update.mockResolvedValue({ count: 0 });
    await expect(
      service.approve('request', {}, reviewer),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(notify).not.toHaveBeenCalled();
    transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('race', {
        code: 'P2034',
        clientVersion: 'test',
      }),
    );
    await expect(
      service.approve('request', {}, reviewer),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('requires an assigned flexible slot and a meaningful fit-in justification', async () => {
    request.mockResolvedValue({
      id: 'request',
      patientId: 'p',
      status: 'PENDING',
      mode: 'FLEXIBLE',
      modality: 'IN_PERSON',
      patient: { userId: actor.sub },
    });
    await expect(
      service.approve('request', {}, reviewer),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.approve(
        'request',
        { doctorId: 'd', startDatetime: start },
        reviewer,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.approve(
      'request',
      {
        doctorId: 'd',
        startDatetime: start,
        receptionNotes: 'Flexibilidade solicitada',
        allowOutsideAvailability: true,
      },
      reviewer,
    );
    expect(appt).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ allowOutsideAvailability: true }),
      'r',
      false,
    );
  });
  it('does not approve or notify when the appointment service rejects a conflict', async () => {
    appt.mockRejectedValue(new ConflictException('Overlap'));
    await expect(
      service.approve('request', {}, reviewer),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
  it('rejects only a pending request and notifies the correct patient', async () => {
    await service.reject('request', reviewer);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request', status: 'PENDING' },
        data: expect.objectContaining({ status: 'REJECTED' }) as unknown,
      }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: actor.sub }) as unknown,
      }),
    );
  });
});
