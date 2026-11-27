import { Injectable, NotFoundException } from '@nestjs/common';
import type { ClinicalDocumentType } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { clinicalDocumentPdf } from '../clinical-documents/clinical-document-pdf';
import type { StoredSection } from '../clinical-documents/clinical-documents.service';

const EXCLUDED_PATIENT_DOC_TYPES: ClinicalDocumentType[] = [
  'GENERAL_NOTE',
  'FIELD_DIARY',
  'GUARDIAN_FEEDBACK',
];

const RECORD_FIELDS = [
  'mainComplaint',
  'clinicalNotes',
  'homework',
  'diagnosticHypothesis',
  'cid10',
  'dsm5',
  'cid11',
  'dsm5Tr',
  'approachUsed',
  'therapeuticPlan',
] as const;

type RecordField = (typeof RECORD_FIELDS)[number];

/**
 * PRI-13: Acesso autenticado do paciente ao próprio prontuário.
 *
 * Separação explícita:
 *  - Evoluções de sessão (`ClinicalRecord`): apenas assinadas (`isSigned = true`)
 *    E explicitamente liberadas pelo psicólogo (`releasedToPatient = true`).
 *  - Documentos clínicos (`ClinicalDocument`): apenas assinados (`SIGNED`),
 *    liberados para o paciente (`PATIENT_RELEASED`) e nunca anotações de trabalho
 *    (`GENERAL_NOTE`, `FIELD_DIARY`) nem devolutivas exclusivas de responsáveis (`GUARDIAN_FEEDBACK`).
 *  - Proteção contra acesso cruzado: qualquer registro de outro paciente retorna 404.
 */
@Injectable()
export class PatientRecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  async listMine(user: AuthUser, ctx: RequestContext = {}) {
    const patient = await this.requireOwnPatient(user);

    const [records, documents] = await Promise.all([
      this.prisma.db.clinicalRecord.findMany({
        where: {
          patientId: patient.id,
          isSigned: true,
          releasedToPatient: true,
        },
        select: {
          id: true,
          sessionSequence: true,
          signedAt: true,
          releasedAt: true,
          updatedAt: true,
          appointment: {
            select: { id: true, startDatetime: true, durationMinutes: true },
          },
          doctor: {
            select: {
              licenseNumber: true,
              specialty: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: [{ sessionSequence: 'desc' }, { signedAt: 'desc' }],
        take: 100,
      }),
      this.prisma.db.clinicalDocument.findMany({
        where: {
          patientId: patient.id,
          status: 'SIGNED',
          visibility: 'PATIENT_RELEASED',
          type: { notIn: EXCLUDED_PATIENT_DOC_TYPES },
        },
        select: {
          id: true,
          type: true,
          title: true,
          documentNumber: true,
          version: true,
          signedAt: true,
          releasedAt: true,
          updatedAt: true,
          doctor: {
            select: {
              licenseNumber: true,
              specialty: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: [{ releasedAt: 'desc' }, { updatedAt: 'desc' }],
        take: 100,
      }),
    ]);

    await this.audit.log({
      actor: user,
      action: 'patient_record.list',
      resource: 'Patient',
      resourceId: patient.id,
      metadata: {
        recordsCount: records.length,
        documentsCount: documents.length,
      },
      ...ctx,
    });

    return {
      records: records.map((r) => ({
        id: r.id,
        sessionSequence: r.sessionSequence,
        signedAt: r.signedAt,
        releasedAt: r.releasedAt,
        appointmentDate: r.appointment.startDatetime,
        durationMinutes: r.appointment.durationMinutes,
        doctor: {
          name: r.doctor.user.name,
          licenseNumber: r.doctor.licenseNumber,
          specialty: r.doctor.specialty,
        },
      })),
      documents: documents.map((d) => ({
        id: d.id,
        type: d.type,
        title: d.title,
        documentNumber: d.documentNumber,
        version: d.version,
        signedAt: d.signedAt,
        releasedAt: d.releasedAt,
        doctor: {
          name: d.doctor.user.name,
          licenseNumber: d.doctor.licenseNumber,
          specialty: d.doctor.specialty,
        },
      })),
    };
  }

  async getSessionRecord(
    recordId: string,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const patient = await this.requireOwnPatient(user);

    const row = await this.prisma.db.clinicalRecord.findFirst({
      where: {
        id: recordId,
        patientId: patient.id,
        isSigned: true,
        releasedToPatient: true,
      },
      include: {
        appointment: {
          select: { id: true, startDatetime: true, durationMinutes: true },
        },
        doctor: {
          select: {
            licenseNumber: true,
            specialty: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Registro clínico não encontrado');
    }

    const decrypted = {} as Record<RecordField, string | null>;
    for (const field of RECORD_FIELDS) {
      const stored = row[field];
      decrypted[field] = stored
        ? this.crypto.decrypt(stored, `clinical_record:${row.id}:${field}`)
        : null;
    }

    await this.audit.log({
      actor: user,
      action: 'patient_record.session.read',
      resource: 'ClinicalRecord',
      resourceId: row.id,
      ...ctx,
    });

    return {
      id: row.id,
      sessionSequence: row.sessionSequence,
      signedAt: row.signedAt,
      releasedAt: row.releasedAt,
      appointmentDate: row.appointment.startDatetime,
      durationMinutes: row.appointment.durationMinutes,
      nextSessionDate: row.nextSessionDate,
      nextSessionRoom: row.nextSessionRoom,
      doctor: {
        name: row.doctor.user.name,
        licenseNumber: row.doctor.licenseNumber,
        specialty: row.doctor.specialty,
      },
      ...decrypted,
    };
  }

  async getDocument(docId: string, user: AuthUser, ctx: RequestContext = {}) {
    const patient = await this.requireOwnPatient(user);

    const row = await this.prisma.db.clinicalDocument.findFirst({
      where: {
        id: docId,
        patientId: patient.id,
        status: 'SIGNED',
        visibility: 'PATIENT_RELEASED',
        type: { notIn: EXCLUDED_PATIENT_DOC_TYPES },
      },
      include: {
        patient: { select: { user: { select: { name: true, cpf: true } } } },
        doctor: {
          select: {
            licenseNumber: true,
            specialty: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Documento clínico não encontrado');
    }

    await this.audit.log({
      actor: user,
      action: 'patient_record.document.read',
      resource: 'ClinicalDocument',
      resourceId: row.id,
      ...ctx,
    });

    return {
      id: row.id,
      type: row.type,
      title: row.title,
      documentNumber: row.documentNumber,
      version: row.version,
      signedAt: row.signedAt,
      releasedAt: row.releasedAt,
      patient: { id: patient.id, name: row.patient.user.name },
      doctor: {
        name: row.doctor.user.name,
        licenseNumber: row.doctor.licenseNumber,
        specialty: row.doctor.specialty,
      },
      sections: this.decryptSections(row.id, row.content),
    };
  }

  async exportDocumentPdf(
    docId: string,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    const patient = await this.requireOwnPatient(user);

    const row = await this.prisma.db.clinicalDocument.findFirst({
      where: {
        id: docId,
        patientId: patient.id,
        status: 'SIGNED',
        visibility: 'PATIENT_RELEASED',
        type: { notIn: EXCLUDED_PATIENT_DOC_TYPES },
      },
      include: {
        patient: { select: { user: { select: { name: true, cpf: true } } } },
        doctor: {
          select: {
            licenseNumber: true,
            specialty: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException('Documento clínico não encontrado');
    }

    const buffer = await clinicalDocumentPdf({
      id: row.id,
      type: row.type,
      title: row.title,
      documentNumber: row.documentNumber,
      version: row.version,
      status: row.status,
      signedAt: row.signedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patientName: row.patient.user.name,
      patientCpf: row.patient.user.cpf,
      doctorName: row.doctor.user.name,
      doctorLicense: row.doctor.licenseNumber,
      doctorSpecialty: row.doctor.specialty,
      sections: this.decryptSections(row.id, row.content),
    });

    await this.audit.log({
      actor: user,
      action: 'patient_record.document.export',
      resource: 'ClinicalDocument',
      resourceId: row.id,
      metadata: { format: 'pdf' },
      ...ctx,
    });

    return {
      filename: `documento-clinico-v${row.version}.pdf`,
      contentType: 'application/pdf',
      buffer,
    };
  }

  private async requireOwnPatient(user: AuthUser) {
    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado');
    }
    return patient;
  }

  private decryptSections(
    documentId: string,
    ciphertext: string,
  ): StoredSection[] {
    const raw = this.crypto.decrypt(
      ciphertext,
      `clinical_document:${documentId}:content`,
    );
    const parsed = JSON.parse(raw) as { sections?: StoredSection[] };
    return Array.isArray(parsed.sections) ? parsed.sections : [];
  }
}
