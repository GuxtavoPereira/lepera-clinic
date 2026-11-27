import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { isValidCpf } from '../../common/utils/cpf';
import { ageInYears, parseBirthDate } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import type { DbClient } from '../../prisma/prisma.types';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { clinicalDocumentPdf } from '../clinical-documents/clinical-document-pdf';
import type { StoredSection } from '../clinical-documents/clinical-documents.service';
import { PasswordService } from '../users/password.service';
import { RegisterGuardianDto } from '../auth/dto/register-guardian.dto';
import {
  AddDependentDto,
  PortalCancelAppointmentDto,
  PortalScheduleRequestDto,
} from './dto/guardian-portal.dto';

const MIN_CANCEL_HOURS = 24;
const AVAILABLE_SLOT_MINUTES = 50;

/**
 * Portal do Responsável (PRI-12) e Devolutivas de Menores (PRI-10).
 *
 * Autorização central: toda operação verifica no banco vínculo ATIVO
 * (`GuardianPatient.status = 'ACTIVE'`) ou ficha própria do ator.
 * Nunca promove o dependente a sessão autenticada nem expõe anotações clínicas internas.
 */
@Injectable()
export class GuardianPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly crypto: EncryptionService,
    private readonly audit: AuditService,
  ) {}

  /** Cadastro público "Para outra pessoa": cria conta do responsável + identidade sem login do menor + vínculo ativamente. */
  async registerGuardian(dto: RegisterGuardianDto, ctx: RequestContext = {}) {
    const guardianBirth = parseBirthDate(dto.birthDate);
    const childBirth = parseBirthDate(dto.dependent.birthDate);

    if (ageInYears(guardianBirth) < 18) {
      throw new BadRequestException(
        'O responsável precisa ter pelo menos 18 anos completos',
      );
    }
    if (ageInYears(childBirth) >= 18) {
      throw new BadRequestException(
        'O cadastro de dependente atende menores de 18 anos. Maiores de idade devem usar o cadastro próprio ("Para mim").',
      );
    }
    if (!isValidCpf(dto.cpf) || !isValidCpf(dto.dependent.cpf)) {
      throw new BadRequestException(
        'Informe CPFs válidos para responsável e dependente',
      );
    }
    if (dto.cpf === dto.dependent.cpf) {
      throw new BadRequestException(
        'O CPF do responsável e o CPF do dependente não podem ser iguais',
      );
    }
    if (dto.useSocialName && !dto.socialName?.trim()) {
      throw new BadRequestException(
        'Informe o nome social do responsável antes de ativar a preferência',
      );
    }
    if (dto.dependent.useSocialName && !dto.dependent.socialName?.trim()) {
      throw new BadRequestException(
        'Informe o nome social do dependente antes de ativar a preferência',
      );
    }

    // Hash fora da transação para não segurar conexão/lock.
    const passwordHash = await this.passwords.hash(dto.password);

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const guardianUser = await tx.user.create({
          data: {
            name: dto.name,
            civilName: dto.name,
            socialName: dto.socialName?.trim() || null,
            useSocialName: dto.useSocialName ?? false,
            email: dto.email,
            passwordHash,
            loginEnabled: true,
            contactPhone: dto.phone,
            cpf: dto.cpf,
            birthDate: guardianBirth,
            role: 'GUARDIAN',
          },
          omit: { passwordHash: true },
        });

        const childUser = await tx.user.create({
          data: {
            name: dto.dependent.name,
            civilName: dto.dependent.name,
            socialName: dto.dependent.socialName?.trim() || null,
            useSocialName: dto.dependent.useSocialName ?? false,
            email: null,
            passwordHash: null,
            loginEnabled: false,
            cpf: dto.dependent.cpf,
            birthDate: childBirth,
            role: 'PATIENT',
          },
          select: { id: true, name: true },
        });

        const patient = await tx.patient.create({
          data: {
            userId: childUser.id,
            insuranceProvider: dto.dependent.insuranceProvider || null,
            insuranceNumber: dto.dependent.insuranceNumber || null,
            emergencyContactName: dto.name,
            emergencyContactPhone: dto.phone,
            phones: {
              create: {
                type: 'mobile',
                phone: dto.phone,
                contactName: dto.name,
              },
            },
          },
          select: { id: true },
        });

        const link = await tx.guardianPatient.create({
          data: {
            guardianUserId: guardianUser.id,
            patientId: patient.id,
            relationship: dto.dependent.relationship,
            status: 'ACTIVE',
            createdByUserId: guardianUser.id,
          },
          select: { id: true },
        });

        await this.audit.log(
          {
            actor: { sub: guardianUser.id, role: 'GUARDIAN' },
            action: 'guardian.register',
            resource: 'GuardianPatient',
            resourceId: link.id,
            metadata: { patientId: patient.id },
            ...ctx,
          },
          tx,
        );

        return guardianUser;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Já existe um cadastro com este e-mail ou CPF. Por segurança, cadastros existentes não são vinculados automaticamente; entre na sua conta ou procure a recepção.',
        );
      }
      throw error;
    }
  }

  /** Lista apenas a ficha própria (se houver) e dependentes com vínculo ATIVO. */
  async listAccessiblePatients(actor: AuthUser) {
    const [ownPatient, links] = await Promise.all([
      this.prisma.db.patient.findUnique({
        where: { userId: actor.sub },
        select: {
          id: true,
          user: {
            select: {
              name: true,
              civilName: true,
              cpf: true,
              birthDate: true,
            },
          },
        },
      }),
      this.prisma.db.guardianPatient.findMany({
        where: { guardianUserId: actor.sub, status: 'ACTIVE' },
        select: {
          id: true,
          relationship: true,
          createdAt: true,
          patient: {
            select: {
              id: true,
              insuranceProvider: true,
              user: {
                select: {
                  name: true,
                  civilName: true,
                  cpf: true,
                  birthDate: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const items = [
      ...(ownPatient
        ? [
            {
              patientId: ownPatient.id,
              linkId: null as string | null,
              isSelf: true,
              relationship: 'Titular',
              name: ownPatient.user.name,
              civilName: ownPatient.user.civilName,
              cpf: ownPatient.user.cpf,
              birthDate: ownPatient.user.birthDate,
              age: ownPatient.user.birthDate
                ? ageInYears(ownPatient.user.birthDate)
                : null,
              insuranceProvider: null as string | null,
            },
          ]
        : []),
      ...links.map((link) => ({
        patientId: link.patient.id,
        linkId: link.id,
        isSelf: false,
        relationship: link.relationship,
        name: link.patient.user.name,
        civilName: link.patient.user.civilName,
        cpf: link.patient.user.cpf,
        birthDate: link.patient.user.birthDate,
        age: link.patient.user.birthDate
          ? ageInYears(link.patient.user.birthDate)
          : null,
        insuranceProvider: link.patient.insuranceProvider,
      })),
    ];

    return { items };
  }

  /** Responsável ou paciente adulto autenticado adiciona mais um dependente menor. */
  async addDependent(
    dto: AddDependentDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const childBirth = parseBirthDate(dto.birthDate);
    if (ageInYears(childBirth) >= 18) {
      throw new BadRequestException(
        'Somente dependentes menores de 18 anos podem ser adicionados por aqui',
      );
    }
    if (!isValidCpf(dto.cpf)) {
      throw new BadRequestException('CPF do dependente inválido');
    }
    if (dto.useSocialName && !dto.socialName?.trim()) {
      throw new BadRequestException(
        'Informe o nome social do dependente antes de ativar a preferência',
      );
    }

    const guardian = await this.prisma.db.user.findUnique({
      where: { id: actor.sub },
      select: {
        id: true,
        name: true,
        cpf: true,
        birthDate: true,
        contactPhone: true,
      },
    });
    if (!guardian) {
      throw new NotFoundException('Conta não encontrada');
    }
    if (guardian.birthDate && ageInYears(guardian.birthDate) < 18) {
      throw new BadRequestException(
        'Apenas contas de maiores de 18 anos podem cadastrar dependentes',
      );
    }
    if (guardian.cpf === dto.cpf) {
      throw new BadRequestException(
        'O CPF do dependente não pode ser igual ao CPF do responsável',
      );
    }

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const childUser = await tx.user.create({
          data: {
            name: dto.name,
            civilName: dto.name,
            socialName: dto.socialName?.trim() || null,
            useSocialName: dto.useSocialName ?? false,
            email: null,
            passwordHash: null,
            loginEnabled: false,
            cpf: dto.cpf,
            birthDate: childBirth,
            role: 'PATIENT',
          },
          select: {
            id: true,
            name: true,
            civilName: true,
            cpf: true,
            birthDate: true,
          },
        });

        const patient = await tx.patient.create({
          data: {
            userId: childUser.id,
            insuranceProvider: dto.insuranceProvider || null,
            insuranceNumber: dto.insuranceNumber || null,
            emergencyContactName: guardian.name,
            emergencyContactPhone: guardian.contactPhone,
            ...(guardian.contactPhone
              ? {
                  phones: {
                    create: {
                      type: 'mobile',
                      phone: guardian.contactPhone,
                      contactName: guardian.name,
                    },
                  },
                }
              : {}),
          },
          select: { id: true, insuranceProvider: true },
        });

        const link = await tx.guardianPatient.create({
          data: {
            guardianUserId: actor.sub,
            patientId: patient.id,
            relationship: dto.relationship,
            status: 'ACTIVE',
            createdByUserId: actor.sub,
          },
          select: { id: true, relationship: true },
        });

        await this.audit.log(
          {
            actor,
            action: 'guardian.dependent.create',
            resource: 'GuardianPatient',
            resourceId: link.id,
            metadata: { patientId: patient.id },
            ...ctx,
          },
          tx,
        );

        return {
          patientId: patient.id,
          linkId: link.id,
          isSelf: false,
          relationship: link.relationship,
          name: childUser.name,
          civilName: childUser.civilName,
          cpf: childUser.cpf,
          birthDate: childUser.birthDate,
          age: childUser.birthDate ? ageInYears(childUser.birthDate) : null,
          insuranceProvider: patient.insuranceProvider,
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Já existe um cadastro com este CPF. Por segurança, procure a recepção para vincular um paciente existente.',
        );
      }
      throw error;
    }
  }

  async listAppointments(patientId: string, actor: AuthUser) {
    await this.assertPatientAccess(this.prisma.db, actor, patientId);
    const items = await this.prisma.db.appointment.findMany({
      where: { patientId },
      select: {
        id: true,
        doctorId: true,
        startDatetime: true,
        endDatetime: true,
        durationMinutes: true,
        modality: true,
        type: true,
        status: true,
        cancelReason: true,
        roomOrLink: true,
        doctor: {
          select: { specialty: true, user: { select: { name: true } } },
        },
      },
      orderBy: { startDatetime: 'desc' },
      take: 50,
    });
    return { items };
  }

  async listScheduleRequests(patientId: string, actor: AuthUser) {
    await this.assertPatientAccess(this.prisma.db, actor, patientId);
    const items = await this.prisma.db.scheduleRequest.findMany({
      where: { patientId },
      select: {
        id: true,
        mode: true,
        status: true,
        modality: true,
        requestedStartDatetime: true,
        preferredDate: true,
        preferredShift: true,
        reason: true,
        createdAt: true,
        preferredDoctor: { select: { user: { select: { name: true } } } },
        generatedAppointment: {
          select: { id: true, startDatetime: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { items };
  }

  async createScheduleRequest(
    patientId: string,
    dto: PortalScheduleRequestDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const mode = dto.mode ?? 'FLEXIBLE';
    if (dto.modality && dto.modality !== 'IN_PERSON') {
      throw new BadRequestException(
        'A clínica realiza somente consultas presenciais',
      );
    }

    let requestedStart: Date | null = null;
    if (mode === 'EXACT') {
      if (!dto.preferredDoctorId || !dto.requestedStartDatetime) {
        throw new BadRequestException(
          'Selecione o profissional e o horário disponível',
        );
      }
      requestedStart = new Date(dto.requestedStartDatetime);
      if (
        Number.isNaN(requestedStart.getTime()) ||
        requestedStart.getTime() <= Date.now()
      ) {
        throw new BadRequestException('Escolha um horário futuro');
      }
    }

    return this.prisma.db.$transaction(
      async (tx) => {
        // Revalida o vínculo DENTRO da transação para prevenir corrida com revogação.
        const access = await this.assertPatientAccess(tx, actor, patientId);

        if (dto.preferredDoctorId) {
          const doctor = await tx.doctor.findUnique({
            where: { id: dto.preferredDoctorId },
            select: { id: true },
          });
          if (!doctor) {
            throw new NotFoundException('Profissional não encontrado');
          }
        }

        const created = await tx.scheduleRequest.create({
          data: {
            patientId,
            requestedByUserId: actor.sub,
            preferredDoctorId: dto.preferredDoctorId ?? null,
            type: dto.type,
            mode,
            modality: 'IN_PERSON',
            requestedStartDatetime: requestedStart,
            durationMinutes: AVAILABLE_SLOT_MINUTES,
            preferredDate: dto.preferredDate
              ? new Date(dto.preferredDate)
              : null,
            preferredShift: dto.preferredShift ?? null,
            reason: dto.reason || null,
          },
        });

        await this.audit.log(
          {
            actor,
            action: 'guardian.schedule_request.create',
            resource: 'ScheduleRequest',
            resourceId: created.id,
            metadata: { patientId, linkId: access.linkId },
            ...ctx,
          },
          tx,
        );

        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async cancelAppointment(
    patientId: string,
    appointmentId: string,
    dto: PortalCancelAppointmentDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    return this.prisma.db.$transaction(
      async (tx) => {
        const access = await this.assertPatientAccess(tx, actor, patientId);

        const appt = await tx.appointment.findFirst({
          where: { id: appointmentId, patientId },
          select: {
            id: true,
            status: true,
            startDatetime: true,
            doctor: { select: { userId: true } },
            patient: { select: { user: { select: { name: true } } } },
          },
        });
        if (!appt) {
          throw new NotFoundException('Consulta não encontrada');
        }
        if (appt.status !== 'SCHEDULED' && appt.status !== 'CONFIRMED') {
          throw new ConflictException(
            'Apenas consultas agendadas ou confirmadas podem ser canceladas',
          );
        }
        const hoursUntil =
          (appt.startDatetime.getTime() - Date.now()) / 3_600_000;
        if (hoursUntil < MIN_CANCEL_HOURS) {
          throw new BadRequestException(
            'Cancelamento permitido apenas com pelo menos 24 horas de antecedência. Entre em contato com a recepção.',
          );
        }

        const cancelled = await tx.appointment.update({
          where: { id: appt.id },
          data: {
            status: 'CANCELLED',
            cancelReason: dto.reason || 'Cancelado pelo responsável via portal',
          },
          select: { id: true, status: true, cancelReason: true },
        });

        await tx.notification.create({
          data: {
            userId: appt.doctor.userId,
            appointmentId: appt.id,
            type: 'alerta',
            title: 'Consulta cancelada',
            message: `A consulta de ${appt.patient.user.name} foi cancelada pelo responsável.`,
          },
        });

        await this.audit.log(
          {
            actor,
            action: 'guardian.appointment.cancel',
            resource: 'Appointment',
            resourceId: appt.id,
            metadata: { patientId, linkId: access.linkId },
            ...ctx,
          },
          tx,
        );

        return cancelled;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  /** PRI-10: Lista SOMENTE documentos de Devolutiva assinados e explicitamente liberados ao responsável. */
  async listGuardianFeedback(
    patientId: string,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const access = await this.assertPatientAccess(
      this.prisma.db,
      actor,
      patientId,
    );
    const rows = await this.prisma.db.clinicalDocument.findMany({
      where: {
        patientId,
        type: 'GUARDIAN_FEEDBACK',
        status: 'SIGNED',
        visibility: 'GUARDIAN_RELEASED',
      },
      select: {
        id: true,
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
    });

    await this.audit.log({
      actor,
      action: 'guardian_feedback.list',
      resource: 'ClinicalDocument',
      resourceId: patientId,
      metadata: { count: rows.length, linkId: access.linkId },
      ...ctx,
    });

    return { items: rows };
  }

  /** PRI-10: Lê e decifra uma Devolutiva liberada ao responsável (nunca anotações internas). */
  async getGuardianFeedback(
    patientId: string,
    documentId: string,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const access = await this.assertPatientAccess(
      this.prisma.db,
      actor,
      patientId,
    );
    const row = await this.prisma.db.clinicalDocument.findFirst({
      where: {
        id: documentId,
        patientId,
        type: 'GUARDIAN_FEEDBACK',
        status: 'SIGNED',
        visibility: 'GUARDIAN_RELEASED',
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
      throw new NotFoundException('Devolutiva não encontrada ou não liberada');
    }

    await this.audit.log({
      actor,
      action: 'guardian_feedback.read',
      resource: 'ClinicalDocument',
      resourceId: row.id,
      metadata: { patientId, linkId: access.linkId },
      ...ctx,
    });

    return {
      id: row.id,
      title: row.title,
      documentNumber: row.documentNumber,
      version: row.version,
      signedAt: row.signedAt,
      releasedAt: row.releasedAt,
      patient: { id: patientId, name: row.patient.user.name },
      doctor: {
        name: row.doctor.user.name,
        licenseNumber: row.doctor.licenseNumber,
        specialty: row.doctor.specialty,
      },
      sections: this.decryptSections(row.id, row.content),
    };
  }

  async exportGuardianFeedbackPdf(
    patientId: string,
    documentId: string,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    const access = await this.assertPatientAccess(
      this.prisma.db,
      actor,
      patientId,
    );
    const row = await this.prisma.db.clinicalDocument.findFirst({
      where: {
        id: documentId,
        patientId,
        type: 'GUARDIAN_FEEDBACK',
        status: 'SIGNED',
        visibility: 'GUARDIAN_RELEASED',
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
      throw new NotFoundException('Devolutiva não encontrada ou não liberada');
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
      actor,
      action: 'guardian_feedback.export',
      resource: 'ClinicalDocument',
      resourceId: row.id,
      metadata: { patientId, linkId: access.linkId, format: 'pdf' },
      ...ctx,
    });

    return {
      filename: `devolutiva-v${row.version}.pdf`,
      contentType: 'application/pdf',
      buffer,
    };
  }

  /** Revogação administrativa/recepção: encerra imediatamente o acesso do responsável. */
  async revokeLink(linkId: string, actor: AuthUser, ctx: RequestContext = {}) {
    const existing = await this.prisma.db.guardianPatient.findUnique({
      where: { id: linkId },
      select: { id: true, status: true, patientId: true, guardianUserId: true },
    });
    if (!existing) {
      throw new NotFoundException('Vínculo não encontrado');
    }
    if (existing.status === 'REVOKED') {
      throw new ConflictException('Este vínculo já está revogado');
    }

    const updated = await this.prisma.db.guardianPatient.update({
      where: { id: linkId },
      data: {
        status: 'REVOKED',
        revokedByUserId: actor.sub,
        revokedAt: new Date(),
      },
      select: { id: true, status: true, revokedAt: true },
    });

    await this.audit.log({
      actor,
      action: 'guardian.link.revoke',
      resource: 'GuardianPatient',
      resourceId: existing.id,
      metadata: {
        patientId: existing.patientId,
        guardianUserId: existing.guardianUserId,
      },
      ...ctx,
    });

    return updated;
  }

  // ---------------------------------------------------------------- helpers

  private async assertPatientAccess(
    db: DbClient,
    actor: AuthUser,
    patientId: string,
  ): Promise<{ isSelf: boolean; linkId: string | null }> {
    const own = await db.patient.findFirst({
      where: { id: patientId, userId: actor.sub },
      select: { id: true },
    });
    if (own) return { isSelf: true, linkId: null };

    const link = await db.guardianPatient.findFirst({
      where: {
        guardianUserId: actor.sub,
        patientId,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    if (!link) {
      throw new NotFoundException('Paciente não encontrado');
    }
    return { isSelf: false, linkId: link.id };
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
