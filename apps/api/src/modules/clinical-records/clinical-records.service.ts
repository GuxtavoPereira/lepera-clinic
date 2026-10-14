import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import type { DbClient } from '../../prisma/prisma.types';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { SaveClinicalRecordDto } from './dto/save-clinical-record.dto';

const SENSITIVE_FIELDS = [
  'mainComplaint',
  'clinicalNotes',
  'homework',
  'diagnosticHypothesis',
  'cid10',
  'dsm5',
  'approachUsed',
  'therapeuticPlan',
] as const;
type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

type ClinicalRecordRow = {
  id: string;
  isSigned: boolean;
  signedAt: Date | null;
  sessionSequence: number;
  nextSessionDate: Date | null;
  nextSessionRoom: string | null;
  updatedAt: Date;
} & Record<SensitiveField, string | null>;

type AppointmentForSummary = {
  id: string;
  startDatetime: Date;
  durationMinutes: number;
  status: string;
  sessionSequence: number | null;
  patient: { id: string; user: { name: string } };
};

const RESOURCE = 'ClinicalRecord';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  async findMine(user: AuthUser) {
    const doctor = await this.requireDoctor(this.prisma.db, user);

    return this.prisma.db.clinicalRecord.findMany({
      where: { doctorId: doctor.id },
      select: {
        id: true,
        appointmentId: true,
        sessionSequence: true,
        isSigned: true,
        signedAt: true,
        updatedAt: true,
        appointment: { select: { startDatetime: true } },
        patient: { select: { user: { select: { name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async getByAppointment(
    appointmentId: string,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const { appointment } = await this.requireOwnAppointment(
      this.prisma.db,
      appointmentId,
      user,
    );

    const record = await this.prisma.db.clinicalRecord.findUnique({
      where: { appointmentId },
    });

    if (record) {
      await this.audit.log({
        actor: user,
        action: 'clinical_record.read',
        resource: RESOURCE,
        resourceId: record.id,
        ...ctx,
      });
    }

    return {
      appointment: this.toSummary(appointment),
      record: record ? this.toResponse(record) : null,
    };
  }

  async save(
    appointmentId: string,
    dto: SaveClinicalRecordDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const { doctor, appointment } = await this.requireOwnAppointment(
          tx,
          appointmentId,
          user,
        );

        if (
          appointment.status === 'CANCELLED' ||
          appointment.status === 'RESCHEDULED'
        ) {
          throw new ConflictException(
            'Não é possível registrar prontuário de consulta cancelada',
          );
        }

        const existing = await tx.clinicalRecord.findUnique({
          where: { appointmentId },
        });
        if (existing?.isSigned) {
          throw new ConflictException(
            'Prontuário já assinado: não pode mais ser alterado',
          );
        }

        const nextSessionDate = this.parseDate(dto.nextSessionDate);
        let record: ClinicalRecordRow;
        let action: string;
        let changed: string[];

        if (existing) {
          const encrypted = this.encryptFields(existing.id, dto);
          record = await tx.clinicalRecord.update({
            where: { id: existing.id },
            data: {
              ...encrypted,
              nextSessionDate,
              nextSessionRoom:
                dto.nextSessionRoom === undefined
                  ? undefined
                  : dto.nextSessionRoom || null,
            },
          });
          action = 'clinical_record.update';
          changed = Object.keys(encrypted);
        } else {
          const id = randomUUID();
          const encrypted = this.encryptFields(id, dto);
          const previous = await tx.clinicalRecord.count({
            where: { patientId: appointment.patientId },
          });
          record = await tx.clinicalRecord.create({
            data: {
              id,
              appointmentId,
              patientId: appointment.patientId,
              doctorId: doctor.id,
              sessionSequence: appointment.sessionSequence ?? previous + 1,
              ...encrypted,
              nextSessionDate: nextSessionDate ?? null,
              nextSessionRoom: dto.nextSessionRoom || null,
            },
          });
          action = 'clinical_record.create';
          changed = Object.keys(encrypted);
        }
        await this.audit.log(
          {
            actor: user,
            action,
            resource: RESOURCE,
            resourceId: record.id,
            metadata: { fields: changed },
            ...ctx,
          },
          tx,
        );

        return {
          appointment: this.toSummary(appointment),
          record: this.toResponse(record),
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'O prontuário desta consulta acabou de ser criado; recarregue a página',
        );
      }
      throw error;
    }
  }

  async sign(appointmentId: string, user: AuthUser, ctx: RequestContext = {}) {
    return this.prisma.db.$transaction(async (tx) => {
      const { appointment } = await this.requireOwnAppointment(
        tx,
        appointmentId,
        user,
      );

      const record = await tx.clinicalRecord.findUnique({
        where: { appointmentId },
      });
      if (!record) {
        throw new NotFoundException('Salve o prontuário antes de assinar');
      }
      if (record.isSigned) {
        throw new ConflictException('Prontuário já assinado');
      }
      if (!record.clinicalNotes) {
        throw new BadRequestException(
          'Preencha a evolução clínica antes de assinar',
        );
      }

      const signed = await tx.clinicalRecord.update({
        where: { id: record.id },
        data: { isSigned: true, signedAt: new Date() },
      });
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { status: 'COMPLETED' },
      });

      await this.audit.log(
        {
          actor: user,
          action: 'clinical_record.sign',
          resource: RESOURCE,
          resourceId: record.id,
          ...ctx,
        },
        tx,
      );

      return {
        appointment: this.toSummary({ ...appointment, status: 'COMPLETED' }),
        record: this.toResponse(signed),
      };
    });
  }

  // ---------------------------------------------------------------- helpers

  private async requireDoctor(db: DbClient, user: AuthUser) {
    const doctor = await db.doctor.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }
    return doctor;
  }

  private async requireOwnAppointment(
    db: DbClient,
    appointmentId: string,
    user: AuthUser,
  ) {
    const doctor = await this.requireDoctor(db, user);

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        doctorId: true,
        patientId: true,
        status: true,
        startDatetime: true,
        durationMinutes: true,
        sessionSequence: true,
        patient: { select: { id: true, user: { select: { name: true } } } },
      },
    });

    if (!appointment || appointment.doctorId !== doctor.id) {
      throw new NotFoundException('Consulta não encontrada');
    }

    return { doctor, appointment };
  }

  private aad(recordId: string, field: string) {
    return `clinical_record:${recordId}:${field}`;
  }

  private encryptFields(recordId: string, dto: SaveClinicalRecordDto) {
    const data: Partial<Record<SensitiveField, string | null>> = {};

    for (const field of SENSITIVE_FIELDS) {
      const value = dto[field];
      if (value === undefined) continue;
      data[field] =
        value && value.trim() !== ''
          ? this.crypto.encrypt(value, this.aad(recordId, field))
          : null;
    }

    return data;
  }

  private decryptFields(record: ClinicalRecordRow) {
    const data = {} as Record<SensitiveField, string | null>;

    for (const field of SENSITIVE_FIELDS) {
      const stored = record[field];
      data[field] = stored
        ? this.crypto.decrypt(stored, this.aad(record.id, field))
        : null;
    }

    return data;
  }

  private toResponse(record: ClinicalRecordRow) {
    return {
      id: record.id,
      isSigned: record.isSigned,
      signedAt: record.signedAt,
      sessionSequence: record.sessionSequence,
      nextSessionDate: record.nextSessionDate,
      nextSessionRoom: record.nextSessionRoom,
      updatedAt: record.updatedAt,
      ...this.decryptFields(record),
    };
  }

  private toSummary(appointment: AppointmentForSummary) {
    return {
      id: appointment.id,
      startDatetime: appointment.startDatetime,
      durationMinutes: appointment.durationMinutes,
      status: appointment.status,
      sessionSequence: appointment.sessionSequence,
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.user.name,
      },
    };
  }

  private parseDate(value: string | null | undefined) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    return new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
  }
}
