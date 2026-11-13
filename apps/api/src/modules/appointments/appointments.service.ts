import { isTransactionConflict } from '../../prisma/prisma-errors';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type AppointmentStatus } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { clinicInstant } from './calendar-time';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import {
  assertWithinAvailability,
  toClinicTime,
  toMinutes,
} from '../availability/availability.check';
import { notifyWaitlistOnFreedSlot } from '../waitlist/waitlist-notify';

/** RN03: antecedência mínima para o PACIENTE cancelar (confirmado: 24h). */
export const PATIENT_MIN_CANCEL_HOURS = 24;

/** Só consultas ainda não realizadas podem ser canceladas. */
export const CANCELLABLE_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
];

export const APPOINTMENT_CANCELLED_NOTICE = {
  type: 'consulta_cancelada',
  title: 'Consulta cancelada',
  message:
    'Uma consulta foi cancelada. Consulte sua agenda para ver os detalhes.',
} as const;

export const APPOINTMENT_RESCHEDULED_NOTICE = {
  type: 'consulta_remarcada',
  title: 'Consulta remarcada',
  message:
    'O horário de uma consulta foi alterado. Consulte sua agenda para conferir o novo horário.',
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Agenda geral (recepção/admin): paginada, com filtro por período e status. */
  async findAll(query: ListAppointmentsQueryDto) {
    const now = new Date();
    const where: Prisma.AppointmentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.day
        ? {
            startDatetime: { lt: clinicInstant(query.day, 24 * 60) },
            AND: [{ endDatetime: { gt: clinicInstant(query.day) } }],
          }
        : {}),
      ...(query.scope === 'upcoming'
        ? { endDatetime: { gte: now } }
        : query.scope === 'past'
          ? { endDatetime: { lt: now } }
          : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.db.appointment.count({ where }),
      this.prisma.db.appointment.findMany({
        where,
        include: {
          patient: { include: { user: { select: { name: true } } } },
          doctor: { include: { user: { select: { name: true } } } },
          cancellationRequests: {
            where: { status: 'PENDING' },
            select: { id: true, reason: true, createdAt: true },
          },
        },
        orderBy: { startDatetime: query.scope === 'upcoming' ? 'asc' : 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  async findMine(user: AuthUser) {
    if (user.role === 'DOCTOR') {
      const doctor = await this.prisma.db.doctor.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });

      if (!doctor) {
        throw new NotFoundException('Perfil profissional não encontrado');
      }

      return this.prisma.db.appointment.findMany({
        where: { doctorId: doctor.id },
        include: {
          patient: { include: { user: { select: { name: true } } } },
        },
        orderBy: { startDatetime: 'asc' },
      });
    }

    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado');
    }

    return this.prisma.db.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { startDatetime: 'desc' },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.db.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        startDatetime: true,
        endDatetime: true,
        durationMinutes: true,
        modality: true,
        type: true,
        status: true,
        cancelReason: true,
        rescheduledToId: true,
        roomOrLink: true,
        receptionNotes: true,
        updatedAt: true,
        patient: { select: { user: { select: { name: true } } } },
        doctor: { select: { user: { select: { name: true } } } },
        cancellationRequests: {
          where: { status: 'PENDING' },
          select: { id: true, reason: true, createdAt: true },
        },
      },
    });
    if (!appointment) throw new NotFoundException('Consulta não encontrada');
    return appointment;
  }

  /**
   * RN03 — cancela a consulta e libera o horário.
   * A liberação é automática: a checagem de conflito (RN01) ignora
   * consultas CANCELLED, então o mesmo horário volta a ficar disponível.
   *
   * - ADMIN/RECEPTIONIST (e SUPER_ADMIN): qualquer consulta, sem antecedência.
   * - PATIENT: só as próprias, com antecedência mínima.
   * - DOCTOR: NÃO cancela direto — pede à recepção (módulo de pedidos de
   *   cancelamento). Consulta de outro paciente responde 404.
   * Pedidos de cancelamento pendentes da consulta são encerrados junto.
   */
  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    if (user.role === 'DOCTOR') {
      throw new ForbiddenException(
        'Profissionais devem solicitar o cancelamento à recepção',
      );
    }

    const appointment = await this.prisma.db.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        status: true,
        startDatetime: true,
        patient: { select: { userId: true } },
        doctor: { select: { userId: true } },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Consulta não encontrada');
    }

    if (user.role === 'PATIENT') {
      const patient = await this.prisma.db.patient.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });

      if (!patient || patient.id !== appointment.patientId) {
        throw new NotFoundException('Consulta não encontrada');
      }

      const limit = new Date(Date.now() + PATIENT_MIN_CANCEL_HOURS * 3_600_000);
      if (appointment.startDatetime < limit) {
        throw new BadRequestException(
          `O cancelamento exige antecedência mínima de ${PATIENT_MIN_CANCEL_HOURS} horas. Entre em contato com a recepção.`,
        );
      }
    }

    if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
      throw new ConflictException('Esta consulta não pode mais ser cancelada');
    }

    return this.prisma.db.$transaction(async (tx) => {
      // updateMany com o status no WHERE evita corrida (duplo clique, duas
      // pessoas cancelando ao mesmo tempo): só uma atualização acontece.
      const updated = await tx.appointment.updateMany({
        where: { id, status: { in: CANCELLABLE_STATUSES } },
        data: { status: 'CANCELLED', cancelReason: dto.reason },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Esta consulta não pode mais ser cancelada',
        );
      }

      await tx.cancellationRequest.updateMany({
        where: { appointmentId: id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewNote: 'Consulta cancelada antes da análise do pedido',
        },
      });

      const recipients = [
        appointment.patient.userId,
        appointment.doctor.userId,
      ].filter((userId) => userId !== user.sub);
      await tx.notification.createMany({
        data: recipients.map((userId) => ({
          ...APPOINTMENT_CANCELLED_NOTICE,
          appointmentId: appointment.id,
          userId,
        })),
      });

      // RF11: a vaga liberada avisa quem está na lista de espera
      await notifyWaitlistOnFreedSlot(tx, {
        doctorId: appointment.doctorId,
        startDatetime: appointment.startDatetime,
      });

      await this.audit.log(
        {
          actor: user,
          action: 'appointment.cancel',
          resource: 'appointment',
          resourceId: id,
          ...ctx,
        },
        tx,
      );
      return tx.appointment.findUnique({ where: { id } });
    });
  }

  async createForRequest(
    tx: Prisma.TransactionClient,
    dto: CreateAppointmentDto,
    receptionistId?: string,
    requirePublishedSlot = false,
  ) {
    const startDatetime = new Date(dto.startDatetime);
    const endDatetime = new Date(
      startDatetime.getTime() + dto.durationMinutes * 60_000,
    );
    if (
      !Number.isFinite(startDatetime.getTime()) ||
      !Number.isInteger(dto.durationMinutes) ||
      dto.durationMinutes < 1 ||
      dto.durationMinutes > 240 ||
      startDatetime.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Escolha um horário futuro e uma duração entre 1 e 240 minutos',
      );
    }
    const [patient, doctor] = await Promise.all([
      tx.patient.findUnique({
        where: { id: dto.patientId },
        include: { user: { select: { isActive: true } } },
      }),
      tx.doctor.findUnique({
        where: { id: dto.doctorId },
        include: { user: { select: { isActive: true } } },
      }),
    ]);

    if (!patient?.user.isActive) {
      throw new NotFoundException('Paciente não encontrado');
    }

    if (!doctor?.user.isActive) {
      throw new NotFoundException('Profissional não encontrado');
    }

    if (requirePublishedSlot || !dto.allowOutsideAvailability) {
      const hours = await tx.doctorAvailability.findMany({
        where: { doctorId: dto.doctorId, isActive: true },
        select: { dayOfWeek: true, startTime: true, endTime: true },
      });
      const from = toClinicTime(startDatetime);
      const to = toClinicTime(endDatetime);
      const fits =
        from.dateKey === to.dateKey &&
        hours.some((slot) => {
          const beginning = toMinutes(slot.startTime);
          return (
            slot.dayOfWeek === from.day &&
            beginning <= from.minutes &&
            to.minutes <= toMinutes(slot.endTime) &&
            (!requirePublishedSlot ||
              (dto.durationMinutes === 50 &&
                (from.minutes - beginning) % 50 === 0 &&
                startDatetime.getUTCSeconds() === 0 &&
                startDatetime.getUTCMilliseconds() === 0))
          );
        });
      if (!fits) {
        throw new ConflictException(
          requirePublishedSlot
            ? 'Este horário não está mais disponível na agenda do profissional. Recuse o pedido e oriente o paciente a escolher outro horário.'
            : 'O profissional não atende neste horário. Escolha outro horário ou autorize explicitamente o encaixe fora da disponibilidade.',
        );
      }
    }

    const conflictingAppointment = await tx.appointment.findFirst({
      where: {
        OR: [{ doctorId: dto.doctorId }, { patientId: dto.patientId }],
        startDatetime: { lt: endDatetime },
        endDatetime: { gt: startDatetime },
        status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
      },
      select: { id: true },
    });

    if (conflictingAppointment) {
      throw new ConflictException(
        'O paciente ou profissional já possui um agendamento nesse horário',
      );
    }

    return tx.appointment.create({
      data: {
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        receptionistId,
        startDatetime,
        endDatetime,
        durationMinutes: dto.durationMinutes,
        modality: dto.modality,
        type: dto.type,
        roomOrLink: dto.roomOrLink,
        receptionNotes: dto.receptionNotes,
      },
    });
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    if (!['ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'].includes(user.role)) {
      throw new ForbiddenException('Solicite a remarcação à recepção');
    }
    const reason = dto.reason?.trim();
    const start = new Date(dto.startDatetime);
    const expectedUpdatedAt = new Date(dto.expectedUpdatedAt);
    if (
      !reason ||
      reason.length < 5 ||
      reason.length > 1000 ||
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(expectedUpdatedAt.getTime()) ||
      start.getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'Informe um horário futuro, a versão da consulta e um motivo com 5 a 1000 caracteres',
      );
    }

    try {
      return await this.prisma.db.$transaction(
        async (tx) => {
          const previous = await tx.appointment.findUnique({
            where: { id },
            include: {
              patient: { select: { userId: true } },
              doctor: { select: { userId: true } },
              progressNote: { select: { id: true } },
              review: { select: { id: true } },
              transaction: { select: { status: true } },
              cancellationRequests: {
                where: { status: 'PENDING' },
                select: { id: true },
                take: 1,
              },
            },
          });
          if (!previous) throw new NotFoundException('Consulta não encontrada');
          if (
            !CANCELLABLE_STATUSES.includes(previous.status) ||
            previous.startDatetime.getTime() <= Date.now() ||
            previous.rescheduledToId
          ) {
            throw new ConflictException(
              'Somente consultas futuras agendadas ou confirmadas podem ser remarcadas',
            );
          }
          if (previous.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
            throw new ConflictException(
              'Esta consulta foi alterada. Atualize a agenda antes de remarcar',
            );
          }
          if (previous.startDatetime.getTime() === start.getTime()) {
            throw new BadRequestException(
              'Escolha um horário diferente do atual',
            );
          }
          if (previous.progressNote || previous.review) {
            throw new ConflictException(
              'Uma consulta com registro de atendimento não pode ser remarcada',
            );
          }
          if (
            previous.transaction &&
            previous.transaction.status !== 'CANCELLED'
          ) {
            throw new ConflictException(
              'Esta consulta tem uma cobrança ativa. Solicite a revisão do financeiro antes de remarcar',
            );
          }
          if (previous.cancellationRequests.length > 0) {
            throw new ConflictException(
              'Analise o pedido de cancelamento pendente antes de remarcar',
            );
          }

          let receptionistId: string | undefined;
          if (user.role === 'RECEPTIONIST') {
            const receptionist = await tx.receptionist.findUnique({
              where: { userId: user.sub },
              select: { id: true },
            });
            if (!receptionist) {
              throw new NotFoundException(
                'Perfil de recepcionista não encontrado',
              );
            }
            receptionistId = receptionist.id;
          }

          // This write also serializes against clinical-record creation, which
          // claims the same appointment before saving a record. Any failure below
          // rolls the status back together with the replacement and its notices.
          const claimed = await tx.appointment.updateMany({
            where: {
              id,
              updatedAt: expectedUpdatedAt,
              status: { in: CANCELLABLE_STATUSES },
              rescheduledToId: null,
            },
            data: { status: 'RESCHEDULED' },
          });
          if (claimed.count !== 1) {
            throw new ConflictException(
              'Esta consulta foi alterada. Atualize a agenda antes de remarcar',
            );
          }
          const next = await this.createForRequest(
            tx,
            {
              patientId: previous.patientId,
              doctorId: previous.doctorId,
              startDatetime: start.toISOString(),
              durationMinutes: previous.durationMinutes,
              modality: previous.modality,
              type: previous.type,
              roomOrLink: previous.roomOrLink ?? undefined,
              receptionNotes: reason,
              allowOutsideAvailability: dto.allowOutsideAvailability === true,
            },
            receptionistId,
          );
          await tx.appointment.update({
            where: { id },
            data: { rescheduledToId: next.id },
          });
          await tx.notification.createMany({
            data: Array.from(
              new Set([previous.patient.userId, previous.doctor.userId]),
              (userId) => ({
                ...APPOINTMENT_RESCHEDULED_NOTICE,
                userId,
                appointmentId: next.id,
              }),
            ),
          });
          if (
            next.startDatetime >= previous.endDatetime ||
            next.endDatetime <= previous.startDatetime
          ) {
            await notifyWaitlistOnFreedSlot(tx, {
              doctorId: previous.doctorId,
              startDatetime: previous.startDatetime,
            });
          }
          await this.audit.log(
            {
              actor: user,
              action: 'appointment.reschedule',
              resource: 'appointment',
              resourceId: id,
              metadata: {
                rescheduledToId: next.id,
                allowOutsideAvailability: dto.allowOutsideAvailability === true,
              },
              ...ctx,
            },
            tx,
          );
          return next;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictException(
          'A consulta ou o horário foi alterado por outra operação. Atualize a agenda e tente novamente',
        );
      }
      throw error;
    }
  }

  async create(
    dto: CreateAppointmentDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const outsideAvailability = dto.allowOutsideAvailability === true;
    const receptionNotes = outsideAvailability
      ? dto.receptionNotes?.trim()
      : dto.receptionNotes;
    if (outsideAvailability && (!receptionNotes || receptionNotes.length < 5)) {
      throw new BadRequestException(
        'Informe uma justificativa para o encaixe (mínimo de 5 caracteres)',
      );
    }
    const startDatetime = new Date(dto.startDatetime);
    const endDatetime = new Date(
      startDatetime.getTime() + dto.durationMinutes * 60_000,
    );

    try {
      return await this.prisma.db.$transaction(
        async (tx) => {
          const [patient, doctor] = await Promise.all([
            tx.patient.findUnique({ where: { id: dto.patientId } }),
            tx.doctor.findUnique({ where: { id: dto.doctorId } }),
          ]);

          if (!patient) {
            throw new NotFoundException('Paciente não encontrado');
          }

          if (!doctor) {
            throw new NotFoundException('Profissional não encontrado');
          }

          let receptionistId: string | undefined;
          if (user.role === 'RECEPTIONIST') {
            const receptionist = await tx.receptionist.findUnique({
              where: { userId: user.sub },
              select: { id: true },
            });

            if (!receptionist) {
              throw new NotFoundException(
                'Perfil de recepcionista não encontrado',
              );
            }
            receptionistId = receptionist.id;
          }

          if (!outsideAvailability) {
            await assertWithinAvailability(
              tx,
              dto.doctorId,
              startDatetime,
              endDatetime,
            );
          }

          const conflictingAppointment = await tx.appointment.findFirst({
            where: {
              OR: [{ doctorId: dto.doctorId }, { patientId: dto.patientId }],
              startDatetime: { lt: endDatetime },
              endDatetime: { gt: startDatetime },
              status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
            },
            select: { id: true },
          });

          if (conflictingAppointment) {
            throw new ConflictException(
              'O paciente ou profissional já possui um agendamento nesse horário',
            );
          }

          const appointment = await tx.appointment.create({
            data: {
              patientId: dto.patientId,
              doctorId: dto.doctorId,
              receptionistId,
              startDatetime,
              endDatetime,
              durationMinutes: dto.durationMinutes,
              modality: dto.modality,
              type: dto.type,
              roomOrLink: dto.roomOrLink,
              receptionNotes,
            },
          });
          await this.audit.log(
            {
              actor: user,
              action: 'appointment.create',
              resource: 'appointment',
              resourceId: appointment.id,
              ...(outsideAvailability
                ? { metadata: { allowOutsideAvailability: true } }
                : {}),
              ...ctx,
            },
            tx,
          );
          return appointment;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictException(
          'O horário foi reservado por outro agendamento; escolha outro horário',
        );
      }
      throw error;
    }
  }
}
