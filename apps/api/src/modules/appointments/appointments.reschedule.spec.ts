import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppointmentsService } from './appointments.service';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

describe('AppointmentsService.reschedule', () => {
  const actor = { sub: 'reception-user', role: 'RECEPTIONIST' as const };
  const version = '2099-04-01T12:00:00.000Z';
  const dto = {
    startDatetime: '2099-05-02T13:00:00.000Z',
    expectedUpdatedAt: version,
    reason: '  Horário combinado com o paciente  ',
  };
  const previous = (overrides: Record<string, unknown> = {}) => ({
    id: 'old',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    startDatetime: new Date('2099-05-01T13:00:00.000Z'),
    endDatetime: new Date('2099-05-01T13:50:00.000Z'),
    durationMinutes: 50,
    updatedAt: new Date(version),
    status: 'CONFIRMED',
    modality: 'ONLINE',
    type: 'RETURN',
    roomOrLink: 'https://example.test/room',
    receptionNotes: 'Nota antiga preservada',
    rescheduledToId: null,
    patient: { userId: 'patient-user' },
    doctor: { userId: 'doctor-user' },
    progressNote: null,
    review: null,
    transaction: null,
    cancellationRequests: [],
    ...overrides,
  });
  let service: AppointmentsService;
  let original: jest.Mock;
  let claim: jest.Mock;
  let create: jest.Mock;
  let link: jest.Mock;
  let conflict: jest.Mock;
  let availability: jest.Mock;
  let waitlist: jest.Mock;
  let notice: jest.Mock;
  let audit: jest.Mock;
  let transaction: jest.Mock;
  let patient: jest.Mock;
  let doctor: jest.Mock;

  beforeEach(() => {
    original = jest.fn().mockResolvedValue(previous());
    claim = jest.fn().mockResolvedValue({ count: 1 });
    create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 'new', status: 'SCHEDULED', ...data }),
    );
    link = jest.fn().mockResolvedValue({});
    conflict = jest.fn().mockResolvedValue(null);
    availability = jest.fn().mockResolvedValue(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        startTime: '08:00',
        endTime: '18:00',
      })),
    );
    patient = jest.fn().mockResolvedValue({ user: { isActive: true } });
    doctor = jest.fn().mockResolvedValue({ user: { isActive: true } });
    waitlist = jest.fn().mockResolvedValue([]);
    notice = jest.fn().mockResolvedValue({ count: 2 });
    audit = jest.fn().mockResolvedValue({});
    const tx = {
      appointment: {
        findUnique: original,
        updateMany: claim,
        findFirst: conflict,
        create,
        update: link,
      },
      patient: { findUnique: patient },
      doctor: { findUnique: doctor },
      receptionist: {
        findUnique: jest.fn().mockResolvedValue({ id: 'reception-1' }),
      },
      doctorAvailability: { findMany: availability },
      waitlist: { findMany: waitlist },
      notification: { createMany: notice },
    };
    transaction = jest.fn((callback: (client: unknown) => Promise<unknown>) =>
      callback(tx),
    );
    service = new AppointmentsService(
      { db: { ...tx, $transaction: transaction } } as unknown as PrismaService,
      { log: audit } as unknown as AuditService,
    );
  });

  it('preserva a origem e cria uma consulta vinculada com os mesmos participantes e condições', async () => {
    const result = await service.reschedule('old', dto, actor);
    expect(result).toMatchObject({
      id: 'new',
      status: 'SCHEDULED',
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      receptionistId: 'reception-1',
      durationMinutes: 50,
      modality: 'ONLINE',
      type: 'RETURN',
      roomOrLink: 'https://example.test/room',
      startDatetime: new Date(dto.startDatetime),
      endDatetime: new Date('2099-05-02T13:50:00.000Z'),
      receptionNotes: dto.reason.trim(),
    });
    expect(claim).toHaveBeenCalledWith({
      where: {
        id: 'old',
        updatedAt: new Date(version),
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        rescheduledToId: null,
      },
      data: { status: 'RESCHEDULED' },
    });
    expect(link).toHaveBeenCalledWith({
      where: { id: 'old' },
      data: { rescheduledToId: 'new' },
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(waitlist).toHaveBeenCalledTimes(1);
  });

  it('vincula os dois avisos à nova consulta sem copiar motivo e audita a autoria', async () => {
    await service.reschedule('old', dto, actor, { userAgent: 'QA' });
    const [notificationPayload] = notice.mock.calls[0] as [
      {
        data: { userId: string; appointmentId: string; type: string }[];
      },
    ];
    expect(notificationPayload.data).toEqual([
      expect.objectContaining({
        userId: 'patient-user',
        appointmentId: 'new',
        type: 'consulta_remarcada',
      }),
      expect.objectContaining({
        userId: 'doctor-user',
        appointmentId: 'new',
        type: 'consulta_remarcada',
      }),
    ]);
    expect(JSON.stringify(notificationPayload)).not.toContain(
      dto.reason.trim(),
    );
    expect(audit).toHaveBeenCalledWith(
      {
        actor,
        action: 'appointment.reschedule',
        resource: 'appointment',
        resourceId: 'old',
        metadata: { rescheduledToId: 'new', allowOutsideAvailability: false },
        userAgent: 'QA',
      },
      expect.anything(),
    );
  });

  it.each(['PATIENT', 'DOCTOR'] as const)(
    'recusa o papel %s antes de consultar dados',
    async (role) => {
      await expect(
        service.reschedule('old', dto, { sub: 'user', role }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it.each(['ADMIN', 'SUPER_ADMIN'] as const)(
    'permite %s com autoria sem atribuir recepcionista',
    async (role) => {
      await expect(
        service.reschedule('old', dto, { sub: 'user', role }),
      ).resolves.toMatchObject({ id: 'new', receptionistId: undefined });
    },
  );

  it.each([
    { startDatetime: '2000-01-01T13:00:00.000Z' },
    { startDatetime: 'invalid' },
    { expectedUpdatedAt: 'invalid' },
    { reason: '    ' },
    { reason: 'a'.repeat(1001) },
  ])('recusa entrada inválida antes da transação (%j)', async (change) => {
    await expect(
      service.reschedule('old', { ...dto, ...change }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('recusa origem inexistente', async () => {
    original.mockResolvedValue(null);
    await expect(service.reschedule('old', dto, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(claim).not.toHaveBeenCalled();
  });

  it.each([
    { status: 'COMPLETED' },
    { status: 'CANCELLED' },
    { status: 'RESCHEDULED' },
    { status: 'WAITING' },
    { startDatetime: new Date('2000-01-01T13:00:00Z') },
    { rescheduledToId: 'another' },
    { updatedAt: new Date('2099-04-02T12:00:00Z') },
    { progressNote: { id: 'record' } },
    { review: { id: 'review' } },
    { transaction: { status: 'PENDING' } },
    { transaction: { status: 'PAID' } },
    { cancellationRequests: [{ id: 'request' }] },
  ])('preserva consultas não elegíveis (%j)', async (change) => {
    original.mockResolvedValue(previous(change));
    await expect(service.reschedule('old', dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(claim).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
  });

  it('permite remarcação com cobrança cancelada sem transferi-la', async () => {
    original.mockResolvedValue(
      previous({ transaction: { status: 'CANCELLED' } }),
    );
    await expect(service.reschedule('old', dto, actor)).resolves.toMatchObject({
      id: 'new',
    });
    const [created] = create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(created.data).not.toHaveProperty('transaction');
  });

  it('recusa o mesmo horário e não modifica a consulta', async () => {
    await expect(
      service.reschedule(
        'old',
        { ...dto, startDatetime: previous().startDatetime.toISOString() },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(claim).not.toHaveBeenCalled();
  });

  it('exige grade cadastrada, permitindo exceção explícita com o motivo informado', async () => {
    availability.mockResolvedValue([]);
    await expect(service.reschedule('old', dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
    await expect(
      service.reschedule(
        'old',
        { ...dto, allowOutsideAvailability: true },
        actor,
      ),
    ).resolves.toMatchObject({ id: 'new' });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { rescheduledToId: 'new', allowOutsideAvailability: true },
      }),
      expect.anything(),
    );
  });

  it('conflito no destino não cria consulta, vínculo, aviso ou auditoria', async () => {
    conflict.mockResolvedValue({ id: 'occupied' });
    await expect(service.reschedule('old', dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(link).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
  });

  it('a perda da disputa pela origem recusa a remarcação antes de criar', async () => {
    claim.mockResolvedValue({ count: 0 });
    await expect(service.reschedule('old', dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(create).not.toHaveBeenCalled();
    expect(notice).not.toHaveBeenCalled();
  });

  it('converte falha de serialização no commit em conflito recuperável', async () => {
    transaction.mockRejectedValue({ code: '40001' });
    await expect(service.reschedule('old', dto, actor)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('não avisa vaga livre quando o novo horário ainda ocupa parte do antigo', async () => {
    await service.reschedule(
      'old',
      { ...dto, startDatetime: '2099-05-01T13:20:00.000Z' },
      actor,
    );
    expect(waitlist).not.toHaveBeenCalled();
    expect(notice).toHaveBeenCalledTimes(1);
  });

  it.each(['patient', 'doctor'] as const)('recusa %s inativo', async (role) => {
    (role === 'patient' ? patient : doctor).mockResolvedValue({
      user: { isActive: false },
    });
    await expect(service.reschedule('old', dto, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(create).not.toHaveBeenCalled();
  });
});

describe('RescheduleAppointmentDto', () => {
  const input = {
    startDatetime: '2099-05-02T13:00:00.000Z',
    expectedUpdatedAt: '2099-04-01T12:00:00.000Z',
    reason: '  Motivo da alteração  ',
  };
  it('normaliza o motivo e aceita instante com fuso', async () => {
    const dto = plainToInstance(RescheduleAppointmentDto, input);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.reason).toBe('Motivo da alteração');
  });
  it.each([
    { startDatetime: '2099-05-02T13:00:00' },
    { expectedUpdatedAt: '2099-04-01' },
    { startDatetime: '2099-02-30T13:00:00Z' },
    { reason: '     ' },
    { reason: 12345 },
    { allowOutsideAvailability: 'true' },
  ])('recusa payload inválido (%j)', async (change) => {
    expect(
      await validate(
        plainToInstance(RescheduleAppointmentDto, { ...input, ...change }),
      ),
    ).not.toHaveLength(0);
  });
});
