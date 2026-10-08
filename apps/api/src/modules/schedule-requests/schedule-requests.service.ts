import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { ApproveScheduleRequestDto } from './dto/approve-schedule-request.dto';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';

@Injectable()
export class ScheduleRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
  ) {}

  async create(dto: CreateScheduleRequestDto, user: AuthUser) {
    if (!dto.preferredDate && !dto.preferredShift) {
      throw new BadRequestException(
        'Informe uma data ou um turno de preferência',
      );
    }

    if (
      dto.preferredDate &&
      dto.preferredDate.slice(0, 10) < new Date().toISOString().slice(0, 10)
    ) {
      throw new BadRequestException('A data de preferência deve ser futura');
    }

    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado');
    }

    if (dto.preferredDoctorId) {
      const doctor = await this.prisma.db.doctor.findUnique({
        where: { id: dto.preferredDoctorId },
        select: { id: true },
      });
      if (!doctor) {
        throw new NotFoundException('Profissional não encontrado');
      }
    }

    return this.prisma.db.scheduleRequest.create({
      data: {
        patientId: patient.id,
        type: dto.type,
        preferredDoctorId: dto.preferredDoctorId,
        preferredDate: dto.preferredDate
          ? new Date(`${dto.preferredDate.slice(0, 10)}T12:00:00.000Z`)
          : undefined,
        preferredShift: dto.preferredShift,
        reason: dto.reason,
      },
      include: {
        preferredDoctor: { include: { user: { select: { name: true } } } },
      },
    });
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
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        preferredDoctor: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(id: string, dto: ApproveScheduleRequestDto, user: AuthUser) {
    const receptionist = await this.prisma.db.receptionist.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });

    if (!receptionist) {
      throw new NotFoundException('Perfil de recepcionista não encontrado');
    }

    try {
      return await this.prisma.db.$transaction(
        async (tx) => {
          const scheduleRequest = await tx.scheduleRequest.findUnique({
            where: { id },
            select: { id: true, patientId: true, status: true },
          });

          if (!scheduleRequest) {
            throw new NotFoundException('Solicitação não encontrada');
          }
          if (scheduleRequest.status !== 'PENDING') {
            throw new ConflictException('Esta solicitação já foi analisada');
          }

          const appointment = await this.appointments.createForRequest(
            tx,
            {
              ...dto,
              patientId: scheduleRequest.patientId,
            },
            receptionist.id,
          );

          const updated = await tx.scheduleRequest.updateMany({
            where: { id, status: 'PENDING' },
            data: {
              status: 'APPROVED',
              approvedById: receptionist.id,
              approvedAt: new Date(),
              reviewedAt: new Date(),
              generatedApptId: appointment.id,
            },
          });
          if (updated.count !== 1) {
            throw new ConflictException('Esta solicitação já foi analisada');
          }

          return { ...appointment, scheduleRequestId: id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'A solicitação ou o horário foi alterado durante a aprovação; atualize e tente novamente',
        );
      }
      throw error;
    }
  }

  async reject(id: string, user: AuthUser) {
    const receptionist = await this.prisma.db.receptionist.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!receptionist) {
      throw new NotFoundException('Perfil de recepcionista não encontrado');
    }

    const updated = await this.prisma.db.scheduleRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        approvedById: receptionist.id,
        reviewedAt: new Date(),
      },
    });

    if (updated.count === 0) {
      const request = await this.prisma.db.scheduleRequest.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!request) {
        throw new NotFoundException('Solicitação não encontrada');
      }
      throw new ConflictException('Esta solicitação já foi analisada');
    }

    return this.prisma.db.scheduleRequest.findUnique({ where: { id } });
  }
}
