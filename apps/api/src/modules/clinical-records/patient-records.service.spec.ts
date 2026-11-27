import { ConflictException, NotFoundException } from '@nestjs/common';
import { EncryptionService } from '../../common/crypto/encryption.service';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClinicalRecordsService } from './clinical-records.service';
import { PatientRecordsService } from './patient-records.service';

describe('PRI-13 (PatientRecordsService) e PRI-14 (Resumo em parágrafo)', () => {
  const patientActor: AuthUser = { sub: 'u-pat-1', role: 'PATIENT' };
  const doctorActor: AuthUser = { sub: 'u-doc-1', role: 'DOCTOR' };

  let crypto: EncryptionService;
  let auditLog: jest.Mock;

  beforeEach(() => {
    crypto = {
      encrypt: jest.fn((v: string) => `enc:${v}`),
      decrypt: jest.fn((v: string) => v.replace(/^enc:/, '')),
    } as unknown as EncryptionService;
    auditLog = jest.fn().mockResolvedValue(undefined);
  });

  it('PRI-13: lista apenas evoluções assinadas+liberadas e documentos PATIENT_RELEASED sem notas internas nem devolutiva', async () => {
    const recFindMany = jest.fn().mockResolvedValue([]);
    const docFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      db: {
        patient: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-1' }) },
        clinicalRecord: { findMany: recFindMany },
        clinicalDocument: { findMany: docFindMany },
      },
    } as unknown as PrismaService;

    const service = new PatientRecordsService(prisma, crypto, {
      log: auditLog,
    } as unknown as AuditService);

    await service.listMine(patientActor);

    expect(recFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patientId: 'pat-1',
          isSigned: true,
          releasedToPatient: true,
        },
      }),
    );
    expect(docFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patientId: 'pat-1',
          status: 'SIGNED',
          visibility: 'PATIENT_RELEASED',
          type: {
            notIn: ['GENERAL_NOTE', 'FIELD_DIARY', 'GUARDIAN_FEEDBACK'],
          },
        },
      }),
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'patient_record.list' }),
    );
  });

  it('PRI-13: retorna 404 para sessão não liberada ou de outro paciente', async () => {
    const prisma = {
      db: {
        patient: { findUnique: jest.fn().mockResolvedValue({ id: 'pat-1' }) },
        clinicalRecord: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    } as unknown as PrismaService;

    const service = new PatientRecordsService(prisma, crypto, {
      log: auditLog,
    } as unknown as AuditService);

    await expect(
      service.getSessionRecord('rec-other', patientActor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('PRI-13: bloqueia liberação de prontuário ainda em rascunho (409)', async () => {
    const tx = {
      doctor: { findUnique: jest.fn().mockResolvedValue({ id: 'doc-1' }) },
      appointment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'appt-1',
          doctorId: 'doc-1',
          patientId: 'pat-1',
          status: 'SCHEDULED',
          startDatetime: new Date(),
          durationMinutes: 50,
          sessionSequence: 1,
          patient: { id: 'pat-1', user: { name: 'Lucas' } },
        }),
      },
      clinicalRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rec-1',
          isSigned: false,
        }),
      },
    };
    const prisma = {
      db: {
        $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      },
    } as unknown as PrismaService;

    const service = new ClinicalRecordsService(prisma, crypto, {
      log: auditLog,
    } as unknown as AuditService);

    await expect(
      service.setPatientRelease('appt-1', true, doctorActor),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('PRI-14: compila parágrafo estruturado sem IA com referências originais e bloqueia profissional não vinculado (404)', async () => {
    const prismaUnlinked = {
      db: {
        doctor: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'doc-1',
            licenseNumber: 'CRP 06/123456',
            specialty: 'Psicologia Clínica',
            user: { name: 'Dr. Roberto' },
          }),
        },
        patient: { findFirst: jest.fn().mockResolvedValue(null) },
      },
    } as unknown as PrismaService;
    const unlinkedService = new ClinicalRecordsService(prismaUnlinked, crypto, {
      log: auditLog,
    } as unknown as AuditService);
    await expect(
      unlinkedService.getPatientParagraphSummary('pat-other', doctorActor),
    ).rejects.toBeInstanceOf(NotFoundException);

    const prismaLinked = {
      db: {
        doctor: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'doc-1',
            licenseNumber: 'CRP 06/123456',
            specialty: 'Psicologia Clínica',
            user: { name: 'Dr. Roberto' },
          }),
        },
        patient: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'pat-1',
            insuranceProvider: 'Unimed',
            user: {
              name: 'Lucas Pereira',
              civilName: 'Lucas Pereira',
              useSocialName: false,
              birthDate: new Date('1995-03-18T12:00:00Z'),
            },
          }),
        },
        appointment: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'appt-1',
              startDatetime: new Date('2026-11-10T14:00:00Z'),
              status: 'COMPLETED',
            },
          ]),
        },
        clinicalRecord: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'rec-1',
              sessionSequence: 1,
              isSigned: true,
              signedAt: new Date('2026-11-10T15:00:00Z'),
              releasedToPatient: false,
              releasedAt: null,
              mainComplaint: 'enc:Ansiedade relacionada ao trabalho',
              clinicalNotes: 'enc:Evolução estável',
              homework: null,
              diagnosticHypothesis: null,
              cid10: null,
              dsm5: null,
              cid11: 'enc:6B00',
              dsm5Tr: null,
              approachUsed: 'enc:TCC',
              therapeuticPlan: 'enc:Treino de respiração e reestruturação',
              nextSessionDate: null,
              nextSessionRoom: null,
              updatedAt: new Date('2026-11-10T15:00:00Z'),
              appointment: {
                id: 'appt-1',
                startDatetime: new Date('2026-11-10T14:00:00Z'),
              },
            },
          ]),
        },
        clinicalDocument: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'doc-10',
              type: 'CLINICAL_REPORT',
              title: 'Relatório de Acompanhamento',
              version: 1,
              signedAt: new Date('2026-11-12T15:00:00Z'),
              updatedAt: new Date('2026-11-12T15:00:00Z'),
            },
          ]),
        },
      },
    } as unknown as PrismaService;

    const linkedService = new ClinicalRecordsService(prismaLinked, crypto, {
      log: auditLog,
    } as unknown as AuditService);
    const res = await linkedService.getPatientParagraphSummary(
      'pat-1',
      doctorActor,
    );

    expect(res.paragraph).toContain('Lucas Pereira');
    expect(res.paragraph).toContain('Ansiedade relacionada ao trabalho');
    expect(res.paragraph).toContain('CID-11: 6B00');
    expect(res.paragraph).toContain('Relatório de Acompanhamento');
    expect(res.disclaimer).toContain('Não utiliza inteligência artificial');
    expect(res.sources).toHaveLength(2);
    expect(res.sources[0]?.href).toBe('/doctor/session/appt-1');
    expect(res.sources[1]?.href).toBe('/doctor/documents/doc-10');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_summary.read' }),
    );
  });
});
