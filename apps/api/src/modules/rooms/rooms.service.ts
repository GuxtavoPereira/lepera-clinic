import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isTransactionConflict,
  isUniqueViolation,
} from '../../prisma/prisma-errors';
import { calendarRange } from '../appointments/calendar-time';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import {
  CancelRoomReservationDto,
  CreateRoomDto,
  CreateRoomReservationDto,
  RoomCalendarQueryDto,
  UpdateRoomDto,
} from './dto/rooms.dto';

const MIN_MINUTES = 15;
const MAX_MINUTES = 480;

const reservationSelect = {
  id: true,
  roomId: true,
  reservedById: true,
  appointmentId: true,
  title: true,
  notes: true,
  startDatetime: true,
  endDatetime: true,
  status: true,
  cancelReason: true,
  cancelledAt: true,
  createdAt: true,
  room: { select: { id: true, name: true, location: true, isActive: true } },
  reservedBy: { select: { id: true, name: true, role: true } },
} satisfies Prisma.RoomReservationSelect;

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  listRooms(includeInactive = false) {
    return this.prisma.db.clinicRoom.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createRoom(
    dto: CreateRoomDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    try {
      const created = await this.prisma.db.clinicRoom.create({
        data: {
          name: dto.name,
          location: dto.location || null,
          capacity: dto.capacity ?? 2,
          notes: dto.notes || null,
        },
      });
      await this.audit.log({
        actor,
        action: 'room.create',
        resource: 'ClinicRoom',
        resourceId: created.id,
        metadata: { name: created.name },
        ...ctx,
      });
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma sala com este nome');
      }
      throw error;
    }
  }

  async updateRoom(
    id: string,
    dto: UpdateRoomDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const existing = await this.prisma.db.clinicRoom.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Sala não encontrada');
    }
    try {
      const updated = await this.prisma.db.clinicRoom.update({
        where: { id },
        data: {
          name: dto.name,
          location:
            dto.location === undefined ? undefined : dto.location || null,
          capacity: dto.capacity,
          notes: dto.notes === undefined ? undefined : dto.notes || null,
          isActive: dto.isActive,
        },
      });
      await this.audit.log({
        actor,
        action: 'room.update',
        resource: 'ClinicRoom',
        resourceId: updated.id,
        metadata: { isActive: updated.isActive },
        ...ctx,
      });
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe uma sala com este nome');
      }
      throw error;
    }
  }

  async calendar(query: RoomCalendarQueryDto) {
    const { from, to } = calendarRange(query);
    const items = await this.prisma.db.roomReservation.findMany({
      where: {
        ...(query.roomId ? { roomId: query.roomId } : {}),
        startDatetime: { lt: to },
        endDatetime: { gt: from },
      },
      select: reservationSelect,
      orderBy: [{ startDatetime: 'asc' }, { id: 'asc' }],
    });
    return { items };
  }

  async reserve(
    dto: CreateRoomReservationDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const start = new Date(dto.startDatetime);
    const end = new Date(dto.endDatetime);
    const minutes = (end.getTime() - start.getTime()) / 60_000;
    if (!Number.isFinite(minutes) || minutes < MIN_MINUTES) {
      throw new BadRequestException(
        `A reserva deve durar pelo menos ${MIN_MINUTES} minutos`,
      );
    }
    if (minutes > MAX_MINUTES) {
      throw new BadRequestException(
        `A reserva pode durar no máximo ${MAX_MINUTES / 60} horas`,
      );
    }

    try {
      return await this.prisma.db.$transaction(
        async (tx) => {
          const room = await tx.clinicRoom.findUnique({
            where: { id: dto.roomId },
            select: { id: true, name: true, isActive: true },
          });
          if (!room) {
            throw new NotFoundException('Sala não encontrada');
          }
          if (!room.isActive) {
            throw new ConflictException(
              'Esta sala está inativa e não aceita novas reservas',
            );
          }

          if (dto.appointmentId) {
            const appt = await tx.appointment.findUnique({
              where: { id: dto.appointmentId },
              select: { id: true },
            });
            if (!appt) {
              throw new NotFoundException('Consulta vinculada não encontrada');
            }
          }

          const conflict = await tx.roomReservation.findFirst({
            where: {
              roomId: dto.roomId,
              status: 'CONFIRMED',
              startDatetime: { lt: end },
              endDatetime: { gt: start },
            },
            select: { id: true },
          });
          if (conflict) {
            throw new ConflictException(
              'Esta sala já está reservada neste horário',
            );
          }

          const created = await tx.roomReservation.create({
            data: {
              roomId: dto.roomId,
              reservedById: actor.sub,
              appointmentId: dto.appointmentId ?? null,
              title: dto.title,
              notes: dto.notes || null,
              startDatetime: start,
              endDatetime: end,
              status: 'CONFIRMED',
            },
            select: reservationSelect,
          });

          await this.audit.log(
            {
              actor,
              action: 'room_reservation.create',
              resource: 'RoomReservation',
              resourceId: created.id,
              metadata: { roomId: dto.roomId },
              ...ctx,
            },
            tx,
          );

          return created;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw new ConflictException(
          'Esta sala acabou de ser reservada por outra pessoa. Atualize e tente novamente',
        );
      }
      throw error;
    }
  }

  async cancelReservation(
    id: string,
    dto: CancelRoomReservationDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const existing = await this.prisma.db.roomReservation.findUnique({
      where: { id },
      select: { id: true, reservedById: true, status: true, roomId: true },
    });
    if (!existing) {
      throw new NotFoundException('Reserva não encontrada');
    }

    const canManageAny = ['ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'].includes(
      actor.role,
    );
    if (!canManageAny && existing.reservedById !== actor.sub) {
      throw new ForbiddenException(
        'Somente o responsável pela reserva, a recepção ou a administração podem cancelá-la',
      );
    }
    if (existing.status === 'CANCELLED') {
      throw new ConflictException('Esta reserva já foi cancelada');
    }

    const cancelled = await this.prisma.db.roomReservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: dto.reason || null,
        cancelledAt: new Date(),
      },
      select: reservationSelect,
    });

    await this.audit.log({
      actor,
      action: 'room_reservation.cancel',
      resource: 'RoomReservation',
      resourceId: cancelled.id,
      metadata: { roomId: existing.roomId },
      ...ctx,
    });

    return cancelled;
  }
}
