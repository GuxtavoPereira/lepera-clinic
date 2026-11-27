import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClinicalDocumentsService } from './clinical-documents.service';

describe('ClinicalDocumentsService (PRI-06)', () => {
  const doctorUser = { sub: 'doctor-user', role: 'DOCTOR' as const };
  const crypto = new EncryptionService({
    getOrThrow: () => 'd'.repeat(64),
  } as unknown as ConfigService);

  let service: ClinicalDocumentsService;
  let doctorFindUnique: jest.Mock;
  let patientFindFirst: jest.Mock;
  let appointmentFindFirst: jest.Mock;
  let docFindMany: jest.Mock;
  let docFindFirst: jest.Mock;
  let docCreate: jest.Mock;
  let docUpdate: jest.Mock;
  let auditLog: jest.Mock;

  function makeRow(overrides: Record<string, unknown> = {}) {
    const id = (overrides.id as string) ?? 'doc-1';
    const content =
      (overrides.content as string) ??
      crypto.encrypt(
        JSON.stringify({
          sections: [
            { key: 'demand', label: 'Demanda', value: 'Avaliação inicial.' },
          ],
        }),
        `clinical_document:${id}:content`,
      );
    return {
      id,
      patientId: 'patient-1',
      doctorId: 'doctor-1',
      appointmentId: null,
      type: 'INITIAL_INTERVIEW',
      title: 'Rapor — Entrevista inicial',
      documentNumber: null,
      version: 1,
      previousVersionId: null,
      nextVersion: null,
      status: 'DRAFT',
      visibility: 'INTERNAL',
      content,
      signedAt: null,
      releasedAt: null,
      createdAt: new Date('2026-11-27T12:00:00Z'),
      updatedAt: new Date('2026-11-27T12:00:00Z'),
      patient: { user: { name: 'Lucas Pereira', cpf: '52998224725' } },
      doctor: {
        licenseNumber: 'CRP 06/123456',
        specialty: 'Psicologia Clínica',
        user: { name: 'Dr. Roberto Silva' },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    patientFindFirst = jest.fn().mockResolvedValue({ id: 'patient-1' });
    appointmentFindFirst = jest.fn().mockResolvedValue({ id: 'appt-1' });
    docFindMany = jest.fn().mockResolvedValue([]);
    docFindFirst = jest.fn().mockResolvedValue(null);
    docCreate = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(makeRow(data)),
    );
    docUpdate = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve(makeRow(data)),
    );
    auditLog = jest.fn().mockResolvedValue({});

    const db: Record<string, unknown> = {
      doctor: { findUnique: doctorFindUnique },
      patient: { findFirst: patientFindFirst },
      appointment: { findFirst: appointmentFindFirst },
      clinicalDocument: {
        findMany: docFindMany,
        findFirst: docFindFirst,
        create: docCreate,
        update: docUpdate,
      },
      $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) => cb(db)),
    };

    service = new ClinicalDocumentsService(
      { db } as unknown as PrismaService,
      crypto,
      { log: auditLog } as unknown as AuditService,
    );
  });

  it('cifra o conteúdo ao criar rascunho e audita sem vazar texto clínico', async () => {
    const result = await service.create(
      {
        patientId: 'patient-1',
        type: 'INITIAL_INTERVIEW',
        title: 'Rapor inicial',
        sections: [
          {
            key: 'complaint',
            label: 'Queixa inicial',
            value: 'Conteúdo sigiloso do paciente.',
          },
        ],
      },
      doctorUser,
    );

    const createdArg = (
      docCreate.mock.calls[0] as [{ data: Record<string, string> }]
    )[0].data;
    expect(createdArg.content).toMatch(/^v1:/);
    expect(createdArg.content).not.toContain('sigiloso');
    expect(result.sections[0].value).toBe('Conteúdo sigiloso do paciente.');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_document.create' }),
      expect.anything(),
    );
    expect(JSON.stringify(auditLog.mock.calls[0])).not.toContain('sigiloso');
  });

  it('recusa criar documento para paciente sem vínculo (404)', async () => {
    patientFindFirst.mockResolvedValue(null);
    await expect(
      service.create(
        {
          patientId: 'other-patient',
          type: 'GENERAL_NOTE',
          title: 'Nota',
          sections: [{ key: 'body', label: 'Anotação', value: 'Texto' }],
        },
        doctorUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(docCreate).not.toHaveBeenCalled();
  });

  it('bloqueia edição de documento já assinado (409)', async () => {
    docFindFirst.mockResolvedValue({
      id: 'doc-1',
      status: 'SIGNED',
      type: 'PSYCHOLOGICAL_REPORT',
      version: 1,
    });
    await expect(
      service.update('doc-1', { title: 'Alterado' }, doctorUser),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(docUpdate).not.toHaveBeenCalled();
  });

  it('exige conteúdo preenchido para assinar e gera número de documento', async () => {
    const emptyContent = crypto.encrypt(
      JSON.stringify({
        sections: [{ key: 'body', label: 'Texto', value: '   ' }],
      }),
      'clinical_document:doc-1:content',
    );
    docFindFirst.mockResolvedValue(makeRow({ content: emptyContent }));
    await expect(service.sign('doc-1', doctorUser)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    docFindFirst.mockResolvedValue(makeRow());
    docUpdate.mockResolvedValue(
      makeRow({
        status: 'SIGNED',
        signedAt: new Date('2026-11-27T13:00:00Z'),
        documentNumber: 'DOC-2026-DOC1',
      }),
    );
    const signed = await service.sign('doc-1', doctorUser);
    expect(signed.status).toBe('SIGNED');
    expect(signed.documentNumber).toBe('DOC-2026-DOC1');
  });

  it('cria revisão v2 em rascunho marcando v1 como SUPERSEDED sem perder histórico', async () => {
    docFindFirst.mockResolvedValue(
      makeRow({
        status: 'SIGNED',
        version: 1,
        documentNumber: 'DOC-2026-ABCD1234',
      }),
    );
    const v2 = await service.revise('doc-1', doctorUser);
    expect(docUpdate).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: { status: 'SUPERSEDED' },
    });
    expect(v2.version).toBe(2);
    expect(v2.status).toBe('DRAFT');
    expect(v2.previousVersionId).toBe('doc-1');
  });

  it('impede liberação de anotação geral, diário de campo e rascunhos não assinados', async () => {
    docFindFirst.mockResolvedValue({
      id: 'doc-note',
      type: 'GENERAL_NOTE',
      status: 'SIGNED',
      version: 1,
    });
    await expect(
      service.updateVisibility(
        'doc-note',
        { visibility: 'PATIENT_RELEASED' },
        doctorUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    docFindFirst.mockResolvedValue({
      id: 'doc-diary',
      type: 'FIELD_DIARY',
      status: 'SIGNED',
      version: 1,
    });
    await expect(
      service.updateVisibility(
        'doc-diary',
        { visibility: 'PATIENT_RELEASED' },
        doctorUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    docFindFirst.mockResolvedValue({
      id: 'doc-draft',
      type: 'CLINICAL_REPORT',
      status: 'DRAFT',
      version: 1,
    });
    await expect(
      service.updateVisibility(
        'doc-draft',
        { visibility: 'PATIENT_RELEASED' },
        doctorUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('exporta PDF válido sem expor CPF integral', async () => {
    docFindFirst.mockResolvedValue(
      makeRow({
        status: 'SIGNED',
        signedAt: new Date('2026-11-27T13:00:00Z'),
        documentNumber: 'DOC-2026-TEST0001',
      }),
    );
    const file = await service.exportPdf('doc-1', doctorUser);
    expect(file.contentType).toBe('application/pdf');
    expect(file.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(file.buffer.toString('latin1')).not.toContain('52998224725');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_document.export' }),
    );
  });
});
