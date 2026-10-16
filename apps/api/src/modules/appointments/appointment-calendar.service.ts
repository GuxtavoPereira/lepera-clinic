import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { toMinutes } from '../availability/availability.check';
import { calendarRange, clinicInstant, DAY_MS } from './calendar-time';
import type { CalendarQueryDto } from './dto/calendar-query.dto';

export const AVAILABLE_SLOT_MINUTES = 50;

const CALENDAR_SELECT = {
  id: true,
  startDatetime: true,
  endDatetime: true,
  status: true,
  type: true,
  modality: true,
  doctorId: true,
  doctor: { select: { user: { select: { name: true } } } },
} as const satisfies Prisma.AppointmentSelect;

type Viewer = { doctorId?: string; patientId?: string };
type FreeSlot = {
  doctorId: string;
  doctorName: string;
  start: string;
  end: string;
};
type CalendarAppointment = Prisma.AppointmentGetPayload<{
  select: typeof CALENDAR_SELECT;
}>;

function calendarItem(row: CalendarAppointment) {
  return {
    id: row.id,
    startDatetime: row.startDatetime,
    endDatetime: row.endDatetime,
    status: row.status,
    type: row.type,
    modality: row.modality,
    doctorId: row.doctorId,
    doctor: { user: { name: row.doctor.user.name } },
  };
}

@Injectable()
export class AppointmentCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async calendar(query: CalendarQueryDto, user: AuthUser) {
    const range = calendarRange(query);
    const viewer = await this.viewer(user, query.doctorId);
    const where = {
      ...viewer,
      startDatetime: { lt: range.to },
      endDatetime: { gt: range.from },
    };
    const orderBy = [{ startDatetime: 'asc' }, { id: 'asc' }] as const;
    if (user.role === 'PATIENT') {
      const rows = await this.prisma.db.appointment.findMany({
        where,
        select: CALENDAR_SELECT,
        orderBy: [...orderBy],
      });
      return { items: rows.map(calendarItem) };
    }
    const rows = await this.prisma.db.appointment.findMany({
      where,
      select: {
        ...CALENDAR_SELECT,
        patient: { select: { user: { select: { name: true } } } },
      },
      orderBy: [...orderBy],
    });
    // Explicit projection also prevents a later include from expanding this response.
    return {
      items: rows.map((row) => ({
        ...calendarItem(row),
        patient: { user: { name: row.patient.user.name } },
      })),
    };
  }

  async availableSlots(query: CalendarQueryDto, user: AuthUser) {
    const range = calendarRange(query);
    const viewer = await this.viewer(user, query.doctorId);
    const doctors = await this.prisma.db.doctor.findMany({
      where: {
        ...(viewer.doctorId ? { id: viewer.doctorId } : {}),
        user: { isActive: true },
        availabilities: { some: { isActive: true } },
      },
      select: {
        id: true,
        user: { select: { name: true } },
        availabilities: {
          where: { isActive: true },
          select: { dayOfWeek: true, startTime: true, endTime: true },
        },
      },
      orderBy: [{ user: { name: 'asc' } }, { id: 'asc' }],
    });
    if (doctors.length === 0) return { items: [] };

    // Same interval overlap and statuses as RN01. No names from occupied slots
    // are selected or returned, including other patients of the chosen doctor.
    const busy = await this.prisma.db.appointment.findMany({
      where: {
        OR: [
          { doctorId: { in: doctors.map((doctor) => doctor.id) } },
          ...(viewer.patientId ? [{ patientId: viewer.patientId }] : []),
        ],
        status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
        startDatetime: { lt: range.to },
        endDatetime: { gt: range.from },
      },
      select: {
        doctorId: true,
        patientId: true,
        startDatetime: true,
        endDatetime: true,
      },
    });
    const now = Date.now();
    const slots = new Map<string, FreeSlot>();
    for (let day = range.firstDay; day < range.lastDay; day += DAY_MS) {
      const dateKey = new Date(day).toISOString().slice(0, 10);
      const weekday = new Date(day).getUTCDay();
      for (const doctor of doctors) {
        for (const availability of doctor.availabilities) {
          if (availability.dayOfWeek !== weekday) continue;
          for (
            let minute = toMinutes(availability.startTime);
            minute + AVAILABLE_SLOT_MINUTES <= toMinutes(availability.endTime);
            minute += AVAILABLE_SLOT_MINUTES
          ) {
            const start = clinicInstant(dateKey, minute);
            const end = clinicInstant(dateKey, minute + AVAILABLE_SLOT_MINUTES);
            if (start.getTime() <= now || end > range.to || start < range.from)
              continue;
            const conflict = busy.some(
              (appointment) =>
                (appointment.doctorId === doctor.id ||
                  (viewer.patientId !== undefined &&
                    appointment.patientId === viewer.patientId)) &&
                appointment.startDatetime < end &&
                appointment.endDatetime > start,
            );
            if (conflict) continue;
            const slot = {
              doctorId: doctor.id,
              doctorName: doctor.user.name,
              start: start.toISOString(),
              end: end.toISOString(),
            };
            slots.set(`${doctor.id}:${slot.start}`, slot);
          }
        }
      }
    }
    return {
      items: [...slots.values()].sort(
        (a, b) =>
          a.start.localeCompare(b.start) ||
          a.doctorName.localeCompare(b.doctorName) ||
          a.doctorId.localeCompare(b.doctorId),
      ),
    };
  }

  private async viewer(
    user: AuthUser,
    requestedDoctorId?: string,
  ): Promise<Viewer> {
    if (user.role === 'DOCTOR') {
      const doctor = await this.prisma.db.doctor.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });
      if (!doctor)
        throw new NotFoundException('Perfil profissional não encontrado');
      if (requestedDoctorId !== undefined && requestedDoctorId !== doctor.id) {
        throw new ForbiddenException('Consulte apenas a própria agenda');
      }
      return { doctorId: doctor.id };
    }
    if (user.role === 'PATIENT') {
      const patient = await this.prisma.db.patient.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });
      if (!patient)
        throw new NotFoundException('Perfil de paciente não encontrado');
      return {
        patientId: patient.id,
        ...(requestedDoctorId ? { doctorId: requestedDoctorId } : {}),
      };
    }
    if (!['ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Perfil sem acesso ao calendário');
    }
    return requestedDoctorId ? { doctorId: requestedDoctorId } : {};
  }
}
