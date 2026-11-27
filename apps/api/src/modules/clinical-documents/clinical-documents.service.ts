import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  isInternalOnlyDocumentType,
  type ClinicalDocumentStatus,
  type ClinicalDocumentType,
  type ClinicalDocumentVisibility,
} from '@lepera/contracts';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { DbClient } from '../../prisma/prisma.types';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { clinicalDocumentPdf } from './clinical-document-pdf';
import {
  CreateClinicalDocumentDto,
  ListClinicalDocumentsDto,
  UpdateClinicalDocumentDto,
  UpdateClinicalDocumentVisibilityDto,
} from './dto/clinical-document.dto';

export type StoredSection = { key: string; label: string; value: string };

type DocumentRow = {
  id: string;
  patientId: string;
  doctorId: string;
  appointmentId: string | null;
  type: ClinicalDocumentType;
  title: string;
  documentNumber: string | null;
  version: number;
  previousVersionId: string | null;
  status: ClinicalDocumentStatus;
  visibility: ClinicalDocumentVisibility;
  content: string;
  signedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { user: { name: string; cpf: string | null } };
  doctor: {
    licenseNumber: string;
    specialty: string;
    user: { name: string };
  };
  nextVersion?: {
    id: string;
    version: number;
    status: ClinicalDocumentStatus;
  } | null;
};

const RESOURCE = 'ClinicalDocument';

const documentInclude = {
  patient: { select: { user: { select: { name: true, cpf: true } } } },
  doctor: {
    select: {
      licenseNumber: true,
      specialty: true,
      user: { select: { name: true } },
    },
  },
  nextVersion: { select: { id: true, version: true, status: true } },
} as const;

@Injectable()
export class ClinicalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  async findMine(query: ListClinicalDocumentsDto, user: AuthUser) {
    const doctor = await this.requireDoctor(this.prisma.db, user);
    const rows = await this.prisma.db.clinicalDocument.findMany({
      where: {
        doctorId: doctor.id,
        ...(query.patientId ? { patientId: query.patientId } : {}),
        ...(query.type ? { type: query.type } : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      select: {
        id: true,
        patientId: true,
        appointmentId: true,
        type: true,
        title: true,
        documentNumber: true,
        version: true,
        previousVersionId: true,
        status: true,
        visibility: true,
        signedAt: true,
        releasedAt: true,
        createdAt: true,
        updatedAt: true,
        patient: { select: { user: { select: { name: true } } } },
        nextVersion: { select: { id: true, version: true, status: true } },
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return { items: rows };
  }

  async findOne(id: string, user: AuthUser, ctx: RequestContext = {}) {
    const doctor = await this.requireDoctor(this.prisma.db, user);
    const row = (await this.prisma.db.clinicalDocument.findFirst({
      where: { id, doctorId: doctor.id },
      include: documentInclude,
    })) as DocumentRow | null;
    if (!row) {
      throw new NotFoundException('Documento clínico não encontrado');
    }
    await this.audit.log({
      actor: user,
      action: 'clinical_document.read',
      resource: RESOURCE,
      resourceId: row.id,
      metadata: { type: row.type, version: row.version },
      ...ctx,
    });
    return this.toResponse(row);
  }

  async create(
    dto: CreateClinicalDocumentDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      const doctor = await this.requireDoctor(tx, user);
      await this.requireLinkedPatient(tx, doctor.id, dto.patientId);

      if (dto.appointmentId) {
        const appt = await tx.appointment.findFirst({
          where: {
            id: dto.appointmentId,
            doctorId: doctor.id,
            patientId: dto.patientId,
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
      const sections = this.normalizeSections(dto.sections);
      const encrypted = this.encryptContent(id, sections);

      const created = (await tx.clinicalDocument.create({
        data: {
          id,
          patientId: dto.patientId,
          doctorId: doctor.id,
          appointmentId: dto.appointmentId ?? null,
          type: dto.type,
          title: dto.title,
          version: 1,
          status: 'DRAFT',
          visibility: 'INTERNAL',
          content: encrypted,
        },
        include: documentInclude,
      })) as DocumentRow;

      await this.audit.log(
        {
          actor: user,
          action: 'clinical_document.create',
          resource: RESOURCE,
          resourceId: created.id,
          metadata: { type: created.type, version: created.version },
          ...ctx,
        },
        tx,
      );

      return this.toResponse(created);
    });
  }

  async update(
    id: string,
    dto: UpdateClinicalDocumentDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    if (dto.title === undefined && dto.sections === undefined) {
      throw new BadRequestException('Informe os campos que deseja atualizar');
    }

    return this.prisma.db.$transaction(async (tx) => {
      const doctor = await this.requireDoctor(tx, user);
      const existing = await tx.clinicalDocument.findFirst({
        where: { id, doctorId: doctor.id },
        select: { id: true, status: true, type: true, version: true },
      });
      if (!existing) {
        throw new NotFoundException('Documento clínico não encontrado');
      }
      if (existing.status !== 'DRAFT') {
        throw new ConflictException(
          'Documento assinado ou substituído não pode ser alterado. Crie uma nova revisão.',
        );
      }

      const updated = (await tx.clinicalDocument.update({
        where: { id: existing.id },
        data: {
          title: dto.title,
          content:
            dto.sections !== undefined
              ? this.encryptContent(
                  existing.id,
                  this.normalizeSections(dto.sections),
                )
              : undefined,
        },
        include: documentInclude,
      })) as DocumentRow;

      await this.audit.log(
        {
          actor: user,
          action: 'clinical_document.update',
          resource: RESOURCE,
          resourceId: updated.id,
          metadata: { type: updated.type, version: updated.version },
          ...ctx,
        },
        tx,
      );

      return this.toResponse(updated);
    });
  }

  async sign(id: string, user: AuthUser, ctx: RequestContext = {}) {
    return this.prisma.db.$transaction(async (tx) => {
      const doctor = await this.requireDoctor(tx, user);
      const existing = (await tx.clinicalDocument.findFirst({
        where: { id, doctorId: doctor.id },
        include: documentInclude,
      })) as DocumentRow | null;
      if (!existing) {
        throw new NotFoundException('Documento clínico não encontrado');
      }
      if (existing.status !== 'DRAFT') {
        throw new ConflictException('Este documento já foi assinado');
      }

      const sections = this.decryptContent(existing.id, existing.content);
      const hasContent = sections.some((s) => s.value.trim().length > 0);
      if (!hasContent) {
        throw new BadRequestException(
          'Preencha pelo menos uma seção do documento antes de assinar',
        );
      }

      const signedAt = new Date();
      const documentNumber =
        existing.documentNumber ??
        this.buildDocumentNumber(existing.id, signedAt);

      const signed = (await tx.clinicalDocument.update({
        where: { id: existing.id },
        data: {
          status: 'SIGNED',
          signedAt,
          documentNumber,
        },
        include: documentInclude,
      })) as DocumentRow;

      await this.audit.log(
        {
          actor: user,
          action: 'clinical_document.sign',
          resource: RESOURCE,
          resourceId: signed.id,
          metadata: {
            type: signed.type,
            version: signed.version,
            documentNumber,
          },
          ...ctx,
        },
        tx,
      );

      return this.toResponse(signed);
    });
  }

  async revise(id: string, user: AuthUser, ctx: RequestContext = {}) {
    return this.prisma.db.$transaction(async (tx) => {
      const doctor = await this.requireDoctor(tx, user);
      const existing = (await tx.clinicalDocument.findFirst({
        where: { id, doctorId: doctor.id },
        include: documentInclude,
      })) as DocumentRow | null;
      if (!existing) {
        throw new NotFoundException('Documento clínico não encontrado');
      }
      if (existing.status !== 'SIGNED') {
        throw new ConflictException(
          'Somente documentos assinados podem gerar uma nova revisão',
        );
      }
      if (existing.nextVersion) {
        throw new ConflictException(
          'Este documento já possui uma revisão posterior',
        );
      }

      const sections = this.decryptContent(existing.id, existing.content);
      const newId = randomUUID();
      const newEncrypted = this.encryptContent(newId, sections);

      await tx.clinicalDocument.update({
        where: { id: existing.id },
        data: { status: 'SUPERSEDED' },
      });

      const revised = (await tx.clinicalDocument.create({
        data: {
          id: newId,
          patientId: existing.patientId,
          doctorId: existing.doctorId,
          appointmentId: existing.appointmentId,
          type: existing.type,
          title: existing.title,
          documentNumber: existing.documentNumber,
          version: existing.version + 1,
          previousVersionId: existing.id,
          status: 'DRAFT',
          visibility: 'INTERNAL',
          content: newEncrypted,
        },
        include: documentInclude,
      })) as DocumentRow;

      await this.audit.log(
        {
          actor: user,
          action: 'clinical_document.revise',
          resource: RESOURCE,
          resourceId: revised.id,
          metadata: {
            type: revised.type,
            version: revised.version,
            previousVersionId: existing.id,
          },
          ...ctx,
        },
        tx,
      );

      return this.toResponse(revised);
    });
  }

  async updateVisibility(
    id: string,
    dto: UpdateClinicalDocumentVisibilityDto,
    user: AuthUser,
    ctx: RequestContext = {},
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      const doctor = await this.requireDoctor(tx, user);
      const existing = await tx.clinicalDocument.findFirst({
        where: { id, doctorId: doctor.id },
        select: { id: true, type: true, status: true, version: true },
      });
      if (!existing) {
        throw new NotFoundException('Documento clínico não encontrado');
      }
      if (dto.visibility !== 'INTERNAL') {
        if (isInternalOnlyDocumentType(existing.type)) {
          throw new BadRequestException(
            'Anotações gerais e diário de campo são de uso interno e não podem ser liberados',
          );
        }
        if (existing.status !== 'SIGNED') {
          throw new ConflictException(
            'Assine o documento antes de liberá-lo para visualização',
          );
        }
        if (
          dto.visibility === 'GUARDIAN_RELEASED' &&
          existing.type !== 'GUARDIAN_FEEDBACK'
        ) {
          throw new BadRequestException(
            'A liberação ao responsável é específica para documentos de devolutiva',
          );
        }
      }

      const updated = (await tx.clinicalDocument.update({
        where: { id: existing.id },
        data: {
          visibility: dto.visibility,
          releasedAt: dto.visibility === 'INTERNAL' ? null : new Date(),
        },
        include: documentInclude,
      })) as DocumentRow;

      await this.audit.log(
        {
          actor: user,
          action: 'clinical_document.visibility',
          resource: RESOURCE,
          resourceId: updated.id,
          metadata: {
            type: updated.type,
            version: updated.version,
            visibility: updated.visibility,
          },
          ...ctx,
        },
        tx,
      );

      return this.toResponse(updated);
    });
  }

  async exportPdf(id: string, user: AuthUser, ctx: RequestContext = {}) {
    const doctor = await this.requireDoctor(this.prisma.db, user);
    const row = (await this.prisma.db.clinicalDocument.findFirst({
      where: { id, doctorId: doctor.id },
      include: documentInclude,
    })) as DocumentRow | null;
    if (!row) {
      throw new NotFoundException('Documento clínico não encontrado');
    }

    const sections = this.decryptContent(row.id, row.content);
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
      sections,
    });

    await this.audit.log({
      actor: user,
      action: 'clinical_document.export',
      resource: RESOURCE,
      resourceId: row.id,
      metadata: { type: row.type, version: row.version, format: 'pdf' },
      ...ctx,
    });

    const slug = row.title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 48);

    return {
      filename: `${slug || 'documento'}-v${row.version}.pdf`,
      contentType: 'application/pdf',
      buffer,
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

  private async requireLinkedPatient(
    db: DbClient,
    doctorId: string,
    patientId: string,
  ) {
    const linked = await db.patient.findFirst({
      where: {
        id: patientId,
        OR: [
          { responsibleDoctorId: doctorId },
          { appointments: { some: { doctorId } } },
        ],
      },
      select: { id: true },
    });
    if (!linked) {
      throw new NotFoundException(
        'Paciente não encontrado entre seus pacientes vinculados',
      );
    }
  }

  private aad(documentId: string) {
    return `clinical_document:${documentId}:content`;
  }

  private normalizeSections(sections: StoredSection[]): StoredSection[] {
    return sections.map((section) => ({
      key: section.key.trim(),
      label: section.label.trim(),
      value: section.value,
    }));
  }

  private encryptContent(documentId: string, sections: StoredSection[]) {
    return this.crypto.encrypt(
      JSON.stringify({ sections }),
      this.aad(documentId),
    );
  }

  private decryptContent(
    documentId: string,
    ciphertext: string,
  ): StoredSection[] {
    const raw = this.crypto.decrypt(ciphertext, this.aad(documentId));
    const parsed = JSON.parse(raw) as { sections?: StoredSection[] };
    return Array.isArray(parsed.sections) ? parsed.sections : [];
  }

  private buildDocumentNumber(id: string, date: Date) {
    const year = date.getUTCFullYear();
    const short = id.replace(/-/g, '').slice(0, 8).toUpperCase();
    return `DOC-${year}-${short}`;
  }

  private toResponse(row: DocumentRow) {
    return {
      id: row.id,
      patientId: row.patientId,
      appointmentId: row.appointmentId,
      type: row.type,
      title: row.title,
      documentNumber: row.documentNumber,
      version: row.version,
      previousVersionId: row.previousVersionId,
      nextVersion: row.nextVersion ?? null,
      status: row.status,
      visibility: row.visibility,
      signedAt: row.signedAt,
      releasedAt: row.releasedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: { id: row.patientId, name: row.patient.user.name },
      doctor: {
        name: row.doctor.user.name,
        licenseNumber: row.doctor.licenseNumber,
        specialty: row.doctor.specialty,
      },
      sections: this.decryptContent(row.id, row.content),
    };
  }
}
