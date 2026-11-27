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
import { ageInYears } from '../../common/utils/dates';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { SaveClinicalRecordDto } from './dto/save-clinical-record.dto';

const EDITABLE_FIELDS = [
  'mainComplaint',
  'clinicalNotes',
  'homework',
  'diagnosticHypothesis',
  'cid11',
  'dsm5Tr',
  'approachUsed',
  'therapeuticPlan',
] as const;
const HISTORICAL_FIELDS = ['cid10', 'dsm5'] as const;
const SENSITIVE_FIELDS = [...EDITABLE_FIELDS, ...HISTORICAL_FIELDS] as const;
type SensitiveField = (typeof SENSITIVE_FIELDS)[number];

type ClinicalRecordRow = {
  id: string;
  isSigned: boolean;
  signedAt: Date | null;
  releasedToPatient: boolean;
  releasedAt: Date | null;
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
        releasedToPatient: true,
        releasedAt: true,
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

        // Claim the appointment before creating a record. Rescheduling writes
        // this same row, so a competing save rechecks the current status after
        // waiting, while a competing reschedule sees a changed version/record.
        const claimed = await tx.appointment.updateMany({
          where: {
            id: appointment.id,
            doctorId: doctor.id,
            status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
          },
          data: { updatedAt: new Date() },
        });
        if (claimed.count !== 1) {
          throw new ConflictException(
            'A consulta foi cancelada ou remarcada. Atualize a agenda',
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

        // Older forms may echo these fields. Accept an unchanged value, but
        // never create, overwrite or re-encrypt an earlier classification.
        for (const field of HISTORICAL_FIELDS) {
          if (dto[field] === undefined) continue;
          const original = existing?.[field]
            ? this.crypto.decrypt(existing[field], this.aad(existing.id, field))
            : null;
          if ((dto[field] || null) !== original) {
            throw new BadRequestException(
              'CID-10 e DSM-5 são históricos. Reabra o prontuário para registrar CID-11 ou DSM-5-TR.',
            );
          }
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

  /**
   * PRI-13: Liberação explícita de prontuário assinado para o portal do paciente.
   * Rascunhos nunca podem ser liberados; a decisão é sempre do profissional autor.
   */
  async setPatientRelease(
    appointmentId: string,
    released: boolean,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
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
        throw new NotFoundException('Prontuário não encontrado');
      }
      if (!record.isSigned) {
        throw new ConflictException(
          'Assine o prontuário antes de liberar para o paciente',
        );
      }

      const updated = await tx.clinicalRecord.update({
        where: { id: record.id },
        data: {
          releasedToPatient: released,
          releasedAt: released ? new Date() : null,
        },
      });

      if (released) {
        const patient = await tx.patient.findUnique({
          where: { id: appointment.patientId },
          select: {
            userId: true,
            user: { select: { loginEnabled: true } },
          },
        });
        if (patient?.user.loginEnabled !== false && patient) {
          await tx.notification.create({
            data: {
              appointmentId: appointment.id,
              userId: patient.userId,
              type: 'sistema',
              title: 'Novo registro disponível no seu prontuário',
              message:
                'Seu psicólogo liberou uma evolução assinada para consulta em Meu prontuário.',
            },
          });
        }
      }

      await this.audit.log(
        {
          actor: user,
          action: released
            ? 'clinical_record.patient_release'
            : 'clinical_record.patient_unrelease',
          resource: RESOURCE,
          resourceId: record.id,
          metadata: { released },
          ...ctx,
        },
        tx,
      );

      return {
        appointment: this.toSummary(appointment),
        record: this.toResponse(updated),
      };
    });
  }

  /**
   * PRI-14: Compilação estruturada em parágrafo a partir exclusivamente dos registros
   * assinados do próprio profissional vinculado ao paciente.
   * Sem inteligência artificial, sem geração automática de diagnóstico e com referência
   * explícita às fontes originais para revisão do profissional.
   */
  async getPatientParagraphSummary(
    patientId: string,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const doctor = await this.prisma.db.doctor.findUnique({
      where: { userId: user.sub },
      select: {
        id: true,
        licenseNumber: true,
        specialty: true,
        user: { select: { name: true } },
      },
    });
    if (!doctor) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    const patient = await this.prisma.db.patient.findFirst({
      where: {
        id: patientId,
        OR: [
          { responsibleDoctorId: doctor.id },
          { appointments: { some: { doctorId: doctor.id } } },
        ],
      },
      select: {
        id: true,
        insuranceProvider: true,
        user: {
          select: {
            name: true,
            civilName: true,
            useSocialName: true,
            birthDate: true,
          },
        },
      },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }

    const [appointments, signedRecords, signedDocuments] = await Promise.all([
      this.prisma.db.appointment.findMany({
        where: { patientId, doctorId: doctor.id },
        select: { id: true, startDatetime: true, status: true },
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.db.clinicalRecord.findMany({
        where: { patientId, doctorId: doctor.id, isSigned: true },
        include: {
          appointment: { select: { id: true, startDatetime: true } },
        },
        orderBy: [{ sessionSequence: 'asc' }, { signedAt: 'asc' }],
      }),
      this.prisma.db.clinicalDocument.findMany({
        where: { patientId, doctorId: doctor.id, status: 'SIGNED' },
        select: {
          id: true,
          type: true,
          title: true,
          version: true,
          signedAt: true,
          updatedAt: true,
        },
        orderBy: [{ signedAt: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    const fmtDate = (d: Date) =>
      new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
      }).format(d);
    const clip = (text: string | null, max = 180) => {
      if (!text) return null;
      const clean = text.replace(/\s+/g, ' ').trim();
      if (!clean) return null;
      return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
    };

    const decryptedRecords = signedRecords.map((rec) => ({
      row: rec,
      fields: this.decryptFields(rec),
    }));

    const age = patient.user.birthDate
      ? ageInYears(patient.user.birthDate)
      : null;
    const completedCount = appointments.filter(
      (a) => a.status === 'COMPLETED',
    ).length;
    const firstAppt = appointments[0]?.startDatetime ?? null;
    const lastAppt =
      appointments[appointments.length - 1]?.startDatetime ?? null;

    const latestRecord = decryptedRecords[decryptedRecords.length - 1] ?? null;
    const latestComplaint = [...decryptedRecords]
      .reverse()
      .find((r) => r.fields.mainComplaint);
    const latestApproach = [...decryptedRecords]
      .reverse()
      .find((r) => r.fields.approachUsed);
    const latestPlan = [...decryptedRecords]
      .reverse()
      .find((r) => r.fields.therapeuticPlan);

    const cid11Set = new Set<string>();
    const dsm5TrSet = new Set<string>();
    const historicalCid10Set = new Set<string>();
    const historicalDsm5Set = new Set<string>();
    for (const item of decryptedRecords) {
      if (item.fields.cid11?.trim()) cid11Set.add(item.fields.cid11.trim());
      if (item.fields.dsm5Tr?.trim()) dsm5TrSet.add(item.fields.dsm5Tr.trim());
      if (item.fields.cid10?.trim())
        historicalCid10Set.add(item.fields.cid10.trim());
      if (item.fields.dsm5?.trim())
        historicalDsm5Set.add(item.fields.dsm5.trim());
    }

    const identityBits: string[] = [];
    if (age !== null) identityBits.push(`${age} ${age === 1 ? 'ano' : 'anos'}`);
    identityBits.push(
      patient.insuranceProvider
        ? `convênio ${patient.insuranceProvider}`
        : 'atendimento particular',
    );

    const sentences: string[] = [];
    const periodText =
      firstAppt && lastAppt
        ? firstAppt.getTime() === lastAppt.getTime()
          ? `em ${fmtDate(firstAppt)}`
          : `entre ${fmtDate(firstAppt)} e ${fmtDate(lastAppt)}`
        : 'sem consultas registradas';
    sentences.push(
      `${patient.user.name} (${identityBits.join(', ')}) está em acompanhamento psicológico presencial com ${doctor.user.name} (${doctor.licenseNumber}), contabilizando ${appointments.length} consulta(s) registrada(s) (${completedCount} concluída(s)) ${periodText}.`,
    );

    if (decryptedRecords.length === 0) {
      sentences.push(
        'Ainda não há evoluções assinadas em prontuário para compor síntese clínica.',
      );
    } else {
      const clinicalBits: string[] = [
        `Constam ${decryptedRecords.length} evolução(ões) assinada(s) em prontuário`,
      ];
      if (latestComplaint) {
        clinicalBits.push(
          `com registro de queixa/tema "${clip(latestComplaint.fields.mainComplaint)}" (Sessão ${latestComplaint.row.sessionSequence}, ${fmtDate(latestComplaint.row.appointment.startDatetime)})`,
        );
      }
      if (latestApproach) {
        clinicalBits.push(
          `abordagem registrada "${clip(latestApproach.fields.approachUsed, 100)}"`,
        );
      }
      if (latestPlan) {
        clinicalBits.push(
          `e plano terapêutico mais recente "${clip(latestPlan.fields.therapeuticPlan)}" (Sessão ${latestPlan.row.sessionSequence})`,
        );
      }
      sentences.push(`${clinicalBits.join(', ')}.`);
    }

    const classificationBits: string[] = [];
    if (cid11Set.size > 0)
      classificationBits.push(`CID-11: ${[...cid11Set].join('; ')}`);
    if (dsm5TrSet.size > 0)
      classificationBits.push(`DSM-5-TR: ${[...dsm5TrSet].join('; ')}`);
    if (historicalCid10Set.size > 0)
      classificationBits.push(
        `CID-10 histórico: ${[...historicalCid10Set].join('; ')}`,
      );
    if (historicalDsm5Set.size > 0)
      classificationBits.push(
        `DSM-5 histórico: ${[...historicalDsm5Set].join('; ')}`,
      );
    if (classificationBits.length > 0) {
      sentences.push(
        `Classificações registradas pelo profissional nos prontuários originais (preservadas sem conversão automática): ${classificationBits.join(' | ')}.`,
      );
    }

    if (signedDocuments.length > 0) {
      const docSummary = signedDocuments
        .slice(0, 5)
        .map((d) => `"${d.title}" (v${d.version})`)
        .join(', ');
      sentences.push(
        `Há ${signedDocuments.length} documento(s) clínico(s) assinado(s) vinculado(s), incluindo ${docSummary}.`,
      );
    }

    if (latestRecord?.row.nextSessionDate) {
      sentences.push(
        `Próxima sessão anotada em prontuário para ${fmtDate(latestRecord.row.nextSessionDate)}${latestRecord.row.nextSessionRoom ? ` (${latestRecord.row.nextSessionRoom})` : ''}.`,
      );
    }

    const sources = [
      ...decryptedRecords.map((item) => ({
        kind: 'clinical_record' as const,
        id: item.row.id,
        label: `Prontuário — Sessão ${item.row.sessionSequence}`,
        date: item.row.appointment.startDatetime.toISOString(),
        href: `/doctor/session/${item.row.appointment.id}`,
      })),
      ...signedDocuments.map((doc) => ({
        kind: 'clinical_document' as const,
        id: doc.id,
        label: `Documento — ${doc.title} (v${doc.version})`,
        date: (doc.signedAt ?? doc.updatedAt).toISOString(),
        href: `/doctor/documents/${doc.id}`,
      })),
    ];

    await this.audit.log({
      actor: user,
      action: 'clinical_summary.read',
      resource: 'Patient',
      resourceId: patient.id,
      metadata: {
        recordsCount: decryptedRecords.length,
        documentsCount: signedDocuments.length,
      },
      ...ctx,
    });

    return {
      generatedAt: new Date().toISOString(),
      patient: {
        id: patient.id,
        name: patient.user.name,
        civilName:
          patient.user.useSocialName &&
          patient.user.civilName &&
          patient.user.civilName !== patient.user.name
            ? patient.user.civilName
            : null,
        age,
        insuranceProvider: patient.insuranceProvider,
      },
      doctor: {
        name: doctor.user.name,
        licenseNumber: doctor.licenseNumber,
        specialty: doctor.specialty,
      },
      stats: {
        totalAppointments: appointments.length,
        completedAppointments: completedCount,
        signedRecords: decryptedRecords.length,
        signedDocuments: signedDocuments.length,
      },
      paragraph: sentences.join(' '),
      disclaimer:
        'Compilação estruturada gerada exclusivamente a partir dos registros assinados por este profissional. Não utiliza inteligência artificial, não gera diagnóstico automático e exige revisão clínica antes de qualquer uso externo.',
      sources,
    };
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

    for (const field of EDITABLE_FIELDS) {
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
      releasedToPatient: record.releasedToPatient ?? false,
      releasedAt: record.releasedAt ?? null,
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
