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
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';

/** RN03: antecedência mínima para o PACIENTE cancelar (confirmado: 24h). */
export const PATIENT_MIN_CANCEL_HOURS = 24;

/** Só consultas ainda não realizadas podem ser canceladas. */
export const CANCELLABLE_STATUSES: AppointmentStatus[] = [
  'SCHEDULED',
  'CONFIRMED',
];

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Agenda geral (recepção/admin): paginada, com filtro por período e status. */
  async findAll(query: ListAppointmentsQueryDto) {
    const now = new Date();
    const where: Prisma.AppointmentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
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
  async cancel(id: string, dto: CancelAppointmentDto, user: AuthUser) {
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
        status: true,
        startDatetime: true,
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

      return tx.appointment.findUnique({ where: { id } });
    });
  }

  async createForRequest(
    tx: Prisma.TransactionClient,
    dto: CreateAppointmentDto,
    receptionistId?: string,
  ) {
    const startDatetime = new Date(dto.startDatetime);
    const endDatetime = new Date(
      startDatetime.getTime() + dto.durationMinutes * 60_000,
    );
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

  async create(dto: CreateAppointmentDto, user: AuthUser) {
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
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'O horário foi reservado por outro agendamento; escolha outro horário',
        );
      }
      throw error;
    }
  }
}
