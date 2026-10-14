import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWaitlistEntryDto,
  UpdateWaitlistEntryDto,
} from './dto/waitlist.dto';

/** Quem ainda espera por uma vaga. */
const ACTIVE_STATUSES = ['waiting', 'notified'];

const ENTRY_INCLUDE = {
  patient: {
    select: { id: true, user: { select: { name: true, email: true } } },
  },
  preferredDoctor: { select: { user: { select: { name: true } } } },
} as const;

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWaitlistEntryDto, user: AuthUser) {
    const isPatient = user.role === 'PATIENT';
    let patientId: string;

    if (isPatient) {
      const patient = await this.prisma.db.patient.findUnique({
        where: { userId: user.sub },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException('Perfil de paciente não encontrado');
      }
      patientId = patient.id;
    } else {
      if (!dto.patientId) {
        throw new BadRequestException('Informe o paciente');
      }
      const patient = await this.prisma.db.patient.findUnique({
        where: { id: dto.patientId },
        select: { id: true },
      });
      if (!patient) {
        throw new NotFoundException('Paciente não encontrado');
      }
      patientId = patient.id;
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

    const existing = await this.prisma.db.waitlist.findFirst({
      where: {
        patientId,
        preferredDoctorId: dto.preferredDoctorId ?? null,
        status: { in: ACTIVE_STATUSES },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe um pedido na lista de espera para este profissional',
      );
    }

    return this.prisma.db.waitlist.create({
      data: {
        patientId,
        preferredDoctorId: dto.preferredDoctorId,
        preferredShift: dto.preferredShift,
        // prioridade é decisão da recepção
        priority: isPatient ? 'MEDIUM' : (dto.priority ?? 'MEDIUM'),
        reason: dto.reason?.trim() || undefined,
      },
      include: ENTRY_INCLUDE,
    });
  }

  /** Fila da recepção: prioridade alta primeiro, depois quem entrou antes. */
  findActive() {
    return this.prisma.db.waitlist.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      include: ENTRY_INCLUDE,
      orderBy: [{ priority: 'asc' }, { enteredAt: 'asc' }],
      take: 200,
    });
  }

  findMine(user: AuthUser) {
    return this.prisma.db.waitlist.findMany({
      where: { patient: { userId: user.sub } },
      include: ENTRY_INCLUDE,
      orderBy: { enteredAt: 'desc' },
      take: 50,
    });
  }

  async update(id: string, dto: UpdateWaitlistEntryDto) {
    const entry = await this.prisma.db.waitlist.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!entry) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const leaving = dto.status === 'scheduled' || dto.status === 'gave_up';

    return this.prisma.db.waitlist.update({
      where: { id },
      data: {
        status: dto.status,
        priority: dto.priority,
        // saiu da fila agora; voltando para "waiting" limpa a saída
        exitedAt: leaving
          ? new Date()
          : dto.status === 'waiting'
            ? null
            : undefined,
      },
      include: ENTRY_INCLUDE,
    });
  }

  /** O paciente desiste do próprio pedido. */
  async leave(id: string, user: AuthUser) {
    const updated = await this.prisma.db.waitlist.updateMany({
      where: {
        id,
        patient: { userId: user.sub },
        status: { in: ACTIVE_STATUSES },
      },
      data: { status: 'gave_up', exitedAt: new Date() },
    });

    // Pedido de outra pessoa (ou já encerrado) responde 404.
    if (updated.count === 0) {
      throw new NotFoundException('Pedido não encontrado');
    }

    return { ok: true };
  }
}
