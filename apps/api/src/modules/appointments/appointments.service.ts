import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createForRequest(
    tx: Prisma.TransactionClient,
    dto: CreateAppointmentDto,
    receptionistId: string,
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
