import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  guidanceMessageCategoryLabels,
  type GuidanceMessageCategory,
} from '@lepera/contracts';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import {
  CreateGuidanceMessageDto,
  ListSentGuidanceMessagesDto,
} from './dto/guidance-message.dto';

type MessageRow = {
  id: string;
  doctorId: string;
  patientId: string;
  appointmentId: string | null;
  category: GuidanceMessageCategory;
  subject: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
  doctor: {
    specialty: string;
    user: { name: string };
  };
  patient: {
    userId: string;
    user: { name: string };
  };
};

const messageInclude = {
  doctor: { select: { specialty: true, user: { select: { name: true } } } },
  patient: { select: { userId: true, user: { select: { name: true } } } },
} as const;

/**
 * Orientações e mensagens do psicólogo ao paciente vinculado (PRI-09).
 * Uma mensagem NÃO altera nem cancela o estado da consulta por si só.
 */
@Injectable()
export class GuidanceMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  async send(
    dto: CreateGuidanceMessageDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      const doctor = await tx.doctor.findUnique({
        where: { userId: user.sub },
        select: { id: true, user: { select: { name: true } } },
      });
      if (!doctor) {
        throw new NotFoundException('Perfil profissional não encontrado');
      }

      const patient = await tx.patient.findFirst({
        where: {
          id: dto.patientId,
          OR: [
            { responsibleDoctorId: doctor.id },
            { appointments: { some: { doctorId: doctor.id } } },
          ],
        },
        select: { id: true, userId: true },
      });
      if (!patient) {
        throw new NotFoundException(
          'Paciente não encontrado entre seus pacientes vinculados',
        );
      }

      if (dto.appointmentId) {
        const appt = await tx.appointment.findFirst({
          where: {
            id: dto.appointmentId,
            doctorId: doctor.id,
            patientId: patient.id,
          },
          select: { id: true },
        });
        if (!appt) {
          throw new NotFoundException(
            'Consulta não encontrada para este paciente e profissional',
          );
        }
      }

      const id = randomUUID();
      const encryptedBody = this.crypto.encrypt(dto.body, this.aad(id));

      const created = await tx.patientGuidanceMessage.create({
        data: {
          id,
          doctorId: doctor.id,
          patientId: patient.id,
          appointmentId: dto.appointmentId ?? null,
          category: dto.category,
          subject: dto.subject,
          body: encryptedBody,
        },
        include: messageInclude,
      });

      // Notificação interna genérica — nunca coloca conteúdo clínico em texto aberto.
      await tx.notification.create({
        data: {
          userId: patient.userId,
          appointmentId: dto.appointmentId ?? null,
          type: 'alerta',
          title: guidanceMessageCategoryLabels[dto.category],
          message: `${doctor.user.name} enviou uma nova mensagem em Orientações.`,
        },
      });

      await this.audit.log(
        {
          actor: user,
          action: 'guidance_message.create',
          resource: 'PatientGuidanceMessage',
          resourceId: created.id,
          metadata: { category: created.category, patientId: patient.id },
          ...ctx,
        },
        tx,
      );

      return this.toResponse(created);
    });
  }

  async findSent(query: ListSentGuidanceMessagesDto, user: AuthUser) {
    const doctor = await this.prisma.db.doctor.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    const rows = (await this.prisma.db.patientGuidanceMessage.findMany({
      where: {
        doctorId: doctor.id,
        ...(query.patientId ? { patientId: query.patientId } : {}),
      },
      include: messageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    })) as MessageRow[];

    return { items: rows.map((row) => this.toResponse(row)) };
  }

  async findMine(user: AuthUser) {
    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado');
    }

    const rows = (await this.prisma.db.patientGuidanceMessage.findMany({
      where: { patientId: patient.id },
      include: messageInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    })) as MessageRow[];

    const items = rows.map((row) => this.toResponse(row));
    const unreadCount = items.filter((item) => !item.readAt).length;
    return { items, unreadCount };
  }

  async markRead(id: string, user: AuthUser) {
    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado');
    }

    const existing = await this.prisma.db.patientGuidanceMessage.findFirst({
      where: { id, patientId: patient.id },
      select: { id: true, readAt: true },
    });
    if (!existing) {
      throw new NotFoundException('Mensagem não encontrada');
    }
    if (existing.readAt) {
      return { id: existing.id, readAt: existing.readAt };
    }

    const readAt = new Date();
    await this.prisma.db.patientGuidanceMessage.update({
      where: { id: existing.id },
      data: { readAt },
    });
    return { id: existing.id, readAt };
  }

  private aad(messageId: string) {
    return `guidance_message:${messageId}:body`;
  }

  private toResponse(row: MessageRow) {
    return {
      id: row.id,
      doctorId: row.doctorId,
      patientId: row.patientId,
      appointmentId: row.appointmentId,
      category: row.category,
      subject: row.subject,
      body: this.crypto.decrypt(row.body, this.aad(row.id)),
      readAt: row.readAt,
      createdAt: row.createdAt,
      doctor: {
        name: row.doctor.user.name,
        specialty: row.doctor.specialty,
      },
      patient: {
        id: row.patientId,
        name: row.patient.user.name,
      },
    };
  }
}
