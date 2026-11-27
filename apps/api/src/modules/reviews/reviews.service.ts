import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { CreateReviewDto } from './dto/create-review.dto';

/**
 * CLI-02: Avaliações de consultas realizadas pelo próprio paciente.
 *
 * Regras:
 *  - Apenas o paciente titular da consulta pode consultar elegibilidade ou avaliar (404 cruzado).
 *  - Apenas consultas com status COMPLETED são elegíveis (400 caso contrário).
 *  - Uma única avaliação por consulta (409 em tentativa duplicada).
 *  - Comentários e identidades nunca são publicados automaticamente no site nem expostos em agregados.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findMine(user: AuthUser) {
    const patient = await this.requirePatient(user);
    const items = await this.prisma.db.review.findMany({
      where: { patientId: patient.id },
      select: {
        id: true,
        appointmentId: true,
        rating: true,
        comment: true,
        createdAt: true,
        doctor: { select: { user: { select: { name: true } } } },
        appointment: { select: { startDatetime: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return {
      items: items.map((r) => ({
        id: r.id,
        appointmentId: r.appointmentId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        doctorName: r.doctor.user.name,
        appointmentDate: r.appointment.startDatetime,
      })),
    };
  }

  async getForAppointment(appointmentId: string, user: AuthUser) {
    const patient = await this.requirePatient(user);
    const appointment = await this.prisma.db.appointment.findFirst({
      where: { id: appointmentId, patientId: patient.id },
      select: {
        id: true,
        startDatetime: true,
        durationMinutes: true,
        status: true,
        type: true,
        doctor: {
          select: {
            specialty: true,
            user: { select: { name: true } },
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    });
    if (!appointment) {
      throw new NotFoundException('Consulta não encontrada');
    }

    return {
      appointment: {
        id: appointment.id,
        startDatetime: appointment.startDatetime,
        durationMinutes: appointment.durationMinutes,
        status: appointment.status,
        type: appointment.type,
        doctor: {
          name: appointment.doctor.user.name,
          specialty: appointment.doctor.specialty,
        },
      },
      eligible: appointment.status === 'COMPLETED' && !appointment.review,
      review: appointment.review,
    };
  }

  async create(
    appointmentId: string,
    dto: CreateReviewDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const patient = await this.requirePatient(user);

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const appointment = await tx.appointment.findFirst({
          where: { id: appointmentId, patientId: patient.id },
          select: {
            id: true,
            doctorId: true,
            status: true,
            review: { select: { id: true } },
          },
        });
        if (!appointment) {
          throw new NotFoundException('Consulta não encontrada');
        }
        if (appointment.status !== 'COMPLETED') {
          throw new BadRequestException(
            'Apenas consultas realizadas podem ser avaliadas',
          );
        }
        if (appointment.review) {
          throw new ConflictException('Esta consulta já foi avaliada');
        }

        const created = await tx.review.create({
          data: {
            appointmentId: appointment.id,
            patientId: patient.id,
            doctorId: appointment.doctorId,
            rating: dto.rating,
            comment: dto.comment?.trim() || null,
          },
          select: {
            id: true,
            appointmentId: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        });

        await this.audit.log(
          {
            actor: user,
            action: 'review.create',
            resource: 'Review',
            resourceId: created.id,
            metadata: { appointmentId: appointment.id, rating: created.rating },
            ...ctx,
          },
          tx,
        );

        return created;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Esta consulta já foi avaliada');
      }
      throw error;
    }
  }

  /** Resumo estritamente agregado (sem comentários nem identificação de pacientes). */
  async aggregateSummary(user: AuthUser) {
    let doctorFilter: string | undefined;
    if (user.role === 'DOCTOR') {
      const doctor = await this.prisma.db.doctor.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });
      if (!doctor) {
        throw new NotFoundException('Perfil profissional não encontrado');
      }
      doctorFilter = doctor.id;
    }

    const agg = await this.prisma.db.review.aggregate({
      where: doctorFilter ? { doctorId: doctorFilter } : undefined,
      _count: { id: true },
      _avg: { rating: true },
    });

    return {
      totalReviews: agg._count.id,
      averageRating:
        agg._avg.rating !== null ? Number(agg._avg.rating.toFixed(2)) : null,
    };
  }

  private async requirePatient(user: AuthUser) {
    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado');
    }
    return patient;
  }
}
