import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { CANCELLABLE_STATUSES } from '../appointments/appointments.service';
import {
  ApproveCancellationRequestDto,
  CreateCancellationRequestDto,
  RejectCancellationRequestDto,
} from './dto/cancellation-request.dto';

const RESOURCE = 'CancellationRequest';

@Injectable()
export class CancellationRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateCancellationRequestDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const doctor = await this.prisma.db.doctor.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    const appointment = await this.prisma.db.appointment.findUnique({
      where: { id: dto.appointmentId },
      select: { id: true, doctorId: true, status: true, startDatetime: true },
    });

    if (!appointment || appointment.doctorId !== doctor.id) {
      throw new NotFoundException('Consulta não encontrada');
    }
    if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
      throw new ConflictException('Esta consulta não pode mais ser cancelada');
    }
    if (appointment.startDatetime <= new Date()) {
      throw new BadRequestException('A consulta já começou ou já passou');
    }

    const pending = await this.prisma.db.cancellationRequest.findFirst({
      where: { appointmentId: appointment.id, status: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException(
        'Já existe um pedido de cancelamento pendente para esta consulta',
      );
    }

    return this.prisma.db.$transaction(async (tx) => {
      const request = await tx.cancellationRequest.create({
        data: {
          appointmentId: appointment.id,
          requestedById: doctor.id,
          reason: dto.reason.trim(),
        },
      });

      await this.audit.log(
        {
          actor: user,
          action: 'cancellation_request.create',
          resource: RESOURCE,
          resourceId: request.id,
          metadata: { appointmentId: appointment.id },
          ...ctx,
        },
        tx,
      );

      return request;
    });
  }

  findMine(user: AuthUser) {
    return this.prisma.db.cancellationRequest.findMany({
      where: { requestedBy: { userId: user.sub } },
      select: {
        id: true,
        appointmentId: true,
        reason: true,
        status: true,
        reviewNote: true,
        createdAt: true,
        reviewedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPending() {
    return this.prisma.db.cancellationRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        appointment: {
          include: {
            patient: { include: { user: { select: { name: true } } } },
            doctor: { include: { user: { select: { name: true } } } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async approve(
    id: string,
    dto: ApproveCancellationRequestDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const reviewerId = await this.resolveReviewerId(user);

    return this.prisma.db.$transaction(async (tx) => {
      const request = await tx.cancellationRequest.findUnique({
        where: { id },
        select: { id: true, status: true, appointmentId: true, reason: true },
      });

      if (!request) {
        throw new NotFoundException('Pedido não encontrado');
      }
      if (request.status !== 'PENDING') {
        throw new ConflictException('Este pedido já foi analisado');
      }

      const cancelled = await tx.appointment.updateMany({
        where: {
          id: request.appointmentId,
          status: { in: CANCELLABLE_STATUSES },
        },
        data: { status: 'CANCELLED', cancelReason: request.reason },
      });
      if (cancelled.count !== 1) {
        throw new ConflictException(
          'A consulta não pode mais ser cancelada; recuse o pedido',
        );
      }

      const updated = await tx.cancellationRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNote: dto.note?.trim() || undefined,
        },
      });

      await this.audit.log(
        {
          actor: user,
          action: 'cancellation_request.approve',
          resource: RESOURCE,
          resourceId: id,
          metadata: { appointmentId: request.appointmentId },
          ...ctx,
        },
        tx,
      );

      return updated;
    });
  }

  async reject(
    id: string,
    dto: RejectCancellationRequestDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const reviewerId = await this.resolveReviewerId(user);

    return this.prisma.db.$transaction(async (tx) => {
      const updated = await tx.cancellationRequest.updateMany({
        where: { id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedById: reviewerId,
          reviewedAt: new Date(),
          reviewNote: dto.note.trim(),
        },
      });

      if (updated.count === 0) {
        const exists = await tx.cancellationRequest.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!exists) {
          throw new NotFoundException('Pedido não encontrado');
        }
        throw new ConflictException('Este pedido já foi analisado');
      }

      await this.audit.log(
        {
          actor: user,
          action: 'cancellation_request.reject',
          resource: RESOURCE,
          resourceId: id,
          ...ctx,
        },
        tx,
      );

      return tx.cancellationRequest.findUnique({ where: { id } });
    });
  }

  private async resolveReviewerId(user: AuthUser): Promise<string | undefined> {
    if (user.role !== 'RECEPTIONIST') return undefined;

    const receptionist = await this.prisma.db.receptionist.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!receptionist) {
      throw new NotFoundException('Perfil de recepcionista não encontrado');
    }
    return receptionist.id;
  }
}
