import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { DbClient } from '../../prisma/prisma.types';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { toMinutes } from './availability.check';
import {
  AvailabilitySlotDto,
  ReplaceAvailabilityDto,
} from './dto/replace-availability.dto';

const DAY_NAMES = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/** Cada faixa precisa ter início < fim e não pode sobrepor outra do mesmo dia. */
export function validateSlots(slots: AvailabilitySlotDto[]) {
  for (const slot of slots) {
    if (toMinutes(slot.startTime) >= toMinutes(slot.endTime)) {
      throw new BadRequestException(
        `Em ${DAY_NAMES[slot.dayOfWeek]}, o horário final precisa ser depois do inicial`,
      );
    }
  }

  const byDay = new Map<number, AvailabilitySlotDto[]>();
  for (const slot of slots) {
    byDay.set(slot.dayOfWeek, [...(byDay.get(slot.dayOfWeek) ?? []), slot]);
  }

  for (const [day, daySlots] of byDay) {
    const sorted = [...daySlots].sort(
      (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime),
    );
    for (let i = 1; i < sorted.length; i++) {
      if (toMinutes(sorted[i].startTime) < toMinutes(sorted[i - 1].endTime)) {
        throw new BadRequestException(
          `Há horários sobrepostos em ${DAY_NAMES[day]}`,
        );
      }
    }
  }
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findMine(user: AuthUser) {
    const doctor = await this.requireDoctor(user);
    return this.list(this.prisma.db, doctor.id);
  }

  /** Para a recepção/paciente enxergarem os horários do profissional. */
  findForDoctor(doctorId: string) {
    return this.list(this.prisma.db, doctorId);
  }

  /** Substitui a grade semanal inteira (o editor envia a lista completa). */
  async replaceMine(
    user: AuthUser,
    dto: ReplaceAvailabilityDto,
    ctx: RequestContext = {},
  ) {
    validateSlots(dto.slots);
    const doctor = await this.requireDoctor(user);

    return this.prisma.db.$transaction(async (tx) => {
      await tx.doctorAvailability.deleteMany({
        where: { doctorId: doctor.id },
      });
      if (dto.slots.length > 0) {
        await tx.doctorAvailability.createMany({
          data: dto.slots.map((slot) => ({
            doctorId: doctor.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
          })),
        });
      }

      await this.audit.log(
        {
          actor: user,
          action: 'availability.update',
          resource: 'DoctorAvailability',
          resourceId: doctor.id,
          metadata: { slots: dto.slots.length },
          ...ctx,
        },
        tx,
      );

      return this.list(tx, doctor.id);
    });
  }

  private list(db: DbClient, doctorId: string) {
    return db.doctorAvailability.findMany({
      where: { doctorId, isActive: true },
      select: { id: true, dayOfWeek: true, startTime: true, endTime: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  private async requireDoctor(user: AuthUser) {
    const doctor = await this.prisma.db.doctor.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }
    return doctor;
  }
}
