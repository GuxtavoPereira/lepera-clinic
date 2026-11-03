import { isTransactionConflict } from '../../prisma/prisma-errors';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AppointmentCalendarService,
  AVAILABLE_SLOT_MINUTES,
} from '../appointments/appointment-calendar.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateAppointmentDto } from '../appointments/dto/create-appointment.dto';
import { toClinicTime } from '../availability/availability.check';
import { ApproveScheduleRequestDto } from './dto/approve-schedule-request.dto';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';

function futureInstant(value: string | undefined): Date {
  if (!value || !/T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    throw new BadRequestException(
      'Informe uma data e horário com fuso horário',
    );
  }
  const start = new Date(value);
  if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
    throw new BadRequestException('Escolha um horário futuro');
  }
  return start;
}

function preferredDay(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const key = value.slice(0, 10);
  const date = new Date(`${key}T12:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(key) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== key
  ) {
    throw new BadRequestException('Informe uma data de preferência válida');
  }
  if (key < toClinicTime(new Date()).dateKey) {
    throw new BadRequestException(
      'A data de preferência deve ser hoje ou futura',
    );
  }
  return date;
}

@Injectable()
export class ScheduleRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly calendar: AppointmentCalendarService,
  ) {}

  async create(dto: CreateScheduleRequestDto, user: AuthUser) {
    const exact = dto.mode === 'EXACT';
    if (!exact && !dto.preferredDate && !dto.preferredShift) {
      throw new BadRequestException(
        'Informe uma data ou um turno de preferência para o encaixe',
      );
    }
    if (!exact && dto.requestedStartDatetime !== undefined) {
      throw new BadRequestException(
        'Para escolher um horário, use a solicitação de horário disponível',
      );
    }
    const start = exact ? futureInstant(dto.requestedStartDatetime) : undefined;
    const preferredDate = preferredDay(dto.preferredDate);
    if (exact && !dto.preferredDoctorId?.trim()) {
      throw new BadRequestException(
        'Selecione o profissional do horário disponível',
      );
    }
    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!patient)
      throw new NotFoundException('Perfil de paciente não encontrado');
    if (dto.preferredDoctorId) {
      const doctor = await this.prisma.db.doctor.findUnique({
        where: { id: dto.preferredDoctorId },
        select: { id: true, user: { select: { isActive: true } } },
      });
      if (!doctor?.user.isActive)
        throw new NotFoundException('Profissional disponível não encontrado');
    }
    if (start && dto.preferredDoctorId) {
      const day = toClinicTime(start).dateKey;
      const next = new Date(`${day}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      const free = await this.calendar.availableSlots(
        {
          from: day,
          to: next.toISOString().slice(0, 10),
          doctorId: dto.preferredDoctorId,
        },
        user,
      );
      if (
        !free.items.some(
          (slot) =>
            slot.doctorId === dto.preferredDoctorId &&
            slot.start === start.toISOString(),
        )
      ) {
        throw new ConflictException(
          'Este horário não está mais disponível. Atualize os horários e escolha outra opção.',
        );
      }
    }
    try {
      return await this.prisma.db.$transaction(
        async (tx) => {
          if (start) {
            const duplicate = await tx.scheduleRequest.findFirst({
              where: {
                patientId: patient.id,
                preferredDoctorId: dto.preferredDoctorId,
                requestedStartDatetime: start,
                mode: 'EXACT',
                status: 'PENDING',
              },
              select: { id: true },
            });
            if (duplicate)
              throw new ConflictException(
                'Você já solicitou este horário. Acompanhe o pedido em Minhas solicitações.',
              );
          }
          return tx.scheduleRequest.create({
            data: {
              patientId: patient.id,
              type: dto.type,
              mode: exact ? 'EXACT' : 'FLEXIBLE',
              preferredDoctorId: dto.preferredDoctorId,
              requestedStartDatetime: start,
              durationMinutes: AVAILABLE_SLOT_MINUTES,
              modality: dto.modality ?? 'IN_PERSON',
              preferredDate: start
                ? new Date(`${toClinicTime(start).dateKey}T12:00:00Z`)
                : preferredDate,
              preferredShift: dto.preferredShift,
              reason: dto.reason?.trim() || undefined,
            },
            include: {
              preferredDoctor: {
                include: { user: { select: { name: true } } },
              },
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  findMine(user: AuthUser) {
    return this.prisma.db.scheduleRequest.findMany({
      where: { patient: { userId: user.sub } },
      include: {
        preferredDoctor: { include: { user: { select: { name: true } } } },
        generatedAppointment: {
          include: {
            doctor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPending() {
    return this.prisma.db.scheduleRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        patient: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        preferredDoctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string, dto: ApproveScheduleRequestDto, user: AuthUser) {
    const reviewerId = await this.resolveReviewerId(user);
    try {
      return await this.prisma.db.$transaction(
        async (tx) => {
          const request = await tx.scheduleRequest.findUnique({
            where: { id },
            select: {
              id: true,
              patientId: true,
              status: true,
              mode: true,
              preferredDoctorId: true,
              requestedStartDatetime: true,
              durationMinutes: true,
              modality: true,
              patient: { select: { userId: true } },
            },
          });
          if (!request)
            throw new NotFoundException('Solicitação não encontrada');
          if (request.status !== 'PENDING')
            throw new ConflictException('Esta solicitação já foi analisada');
          let assignment: CreateAppointmentDto;
          if (request.mode === 'EXACT') {
            if (
              dto.doctorId !== undefined ||
              dto.startDatetime !== undefined ||
              dto.durationMinutes !== undefined ||
              dto.modality !== undefined ||
              dto.type !== undefined ||
              dto.allowOutsideAvailability !== undefined
            ) {
              throw new BadRequestException(
                'O horário escolhido pelo paciente não pode ser alterado na aprovação. Aprove sem alterar os dados ou recuse o pedido.',
              );
            }
            if (
              !request.preferredDoctorId ||
              !request.requestedStartDatetime ||
              request.durationMinutes !== AVAILABLE_SLOT_MINUTES
            ) {
              throw new ConflictException(
                'Pedido sem horário válido; recuse e solicite um novo pedido ao paciente',
              );
            }
            const start = futureInstant(
              request.requestedStartDatetime.toISOString(),
            );
            assignment = {
              patientId: request.patientId,
              doctorId: request.preferredDoctorId,
              startDatetime: start.toISOString(),
              durationMinutes: request.durationMinutes,
              modality: request.modality,
              receptionNotes: dto.receptionNotes,
              roomOrLink: dto.roomOrLink,
            };
          } else {
            if (!dto.doctorId?.trim())
              throw new BadRequestException(
                'Selecione o profissional para o encaixe',
              );
            const start = futureInstant(dto.startDatetime);
            const duration = dto.durationMinutes ?? AVAILABLE_SLOT_MINUTES;
            if (!Number.isInteger(duration) || duration < 1 || duration > 240)
              throw new BadRequestException(
                'A duração deve ser de 1 a 240 minutos',
              );
            if (!dto.receptionNotes || dto.receptionNotes.trim().length < 5)
              throw new BadRequestException(
                'Informe uma justificativa para o encaixe (mínimo de 5 caracteres)',
              );
            assignment = {
              patientId: request.patientId,
              doctorId: dto.doctorId,
              startDatetime: start.toISOString(),
              durationMinutes: duration,
              modality: dto.modality ?? request.modality,
              type: dto.type,
              roomOrLink: dto.roomOrLink,
              receptionNotes: dto.receptionNotes.trim(),
              allowOutsideAvailability: dto.allowOutsideAvailability === true,
            };
          }
          const appointment = await this.appointments.createForRequest(
            tx,
            assignment,
            reviewerId,
            request.mode === 'EXACT',
          );
          const updated = await tx.scheduleRequest.updateMany({
            where: { id, status: 'PENDING' },
            data: {
              status: 'APPROVED',
              approvedById: reviewerId,
              approvedAt: new Date(),
              reviewedAt: new Date(),
              generatedApptId: appointment.id,
            },
          });
          if (updated.count !== 1)
            throw new ConflictException('Esta solicitação já foi analisada');
          await tx.notification.create({
            data: {
              userId: request.patient.userId,
              type: 'confirmacao',
              title: 'Consulta confirmada',
              message: `Sua consulta foi confirmada para ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(assignment.startDatetime))}. Consulte os detalhes na sua agenda.`,
            },
          });
          return { ...appointment, scheduleRequestId: id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async reject(id: string, user: AuthUser) {
    const reviewerId = await this.resolveReviewerId(user);
    try {
      return await this.prisma.db.$transaction(
        async (tx) => {
          const request = await tx.scheduleRequest.findUnique({
            where: { id },
            select: { id: true, patient: { select: { userId: true } } },
          });
          if (!request)
            throw new NotFoundException('Solicitação não encontrada');
          const updated = await tx.scheduleRequest.updateMany({
            where: { id, status: 'PENDING' },
            data: {
              status: 'REJECTED',
              approvedById: reviewerId,
              reviewedAt: new Date(),
            },
          });
          if (updated.count !== 1)
            throw new ConflictException('Esta solicitação já foi analisada');
          await tx.notification.create({
            data: {
              userId: request.patient.userId,
              type: 'alerta',
              title: 'Solicitação não aprovada',
              message:
                'A recepção não pôde confirmar seu pedido. Escolha outro horário disponível ou solicite um encaixe.',
            },
          });
          return tx.scheduleRequest.findUnique({ where: { id } });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  private rethrowConflict(error: unknown): never {
    if (isTransactionConflict(error)) {
      throw new ConflictException(
        'A solicitação ou o horário mudou durante a operação. Atualize e tente novamente.',
      );
    }
    throw error;
  }

  private async resolveReviewerId(user: AuthUser): Promise<string | undefined> {
    if (user.role !== 'RECEPTIONIST') return undefined;
    const receptionist = await this.prisma.db.receptionist.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!receptionist)
      throw new NotFoundException('Perfil de recepcionista não encontrado');
    return receptionist.id;
  }
}
