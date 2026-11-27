import { ConflictException } from '@nestjs/common';
import { EncryptionService } from '../../common/crypto/encryption.service';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClinicalRecordsService } from './clinical-records.service';

describe('ClinicalRecordsService — Session Scales (CLI-01)', () => {
  const doctorActor: AuthUser = { sub: 'user-doc-1', role: 'DOCTOR' };
  let crypto: EncryptionService;
  let encrypt: jest.Mock;
  let auditLog: jest.Mock;

  beforeEach(() => {
    encrypt = jest.fn((v: string) => `v1:${v}`);
    crypto = {
      encrypt,
      decrypt: jest.fn((v: string) => v.replace(/^v1:/, '')),
    } as unknown as EncryptionService;
    auditLog = jest.fn().mockResolvedValue(undefined);
  });

  it('bloqueia alteração de escalas após prontuário assinado (409)', async () => {
    const tx = {
      doctor: { findUnique: jest.fn().mockResolvedValue({ id: 'doc-1' }) },
      appointment: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'appt-1',
          doctorId: 'doc-1',
          patientId: 'pat-1',
          status: 'COMPLETED',
          startDatetime: new Date(),
          durationMinutes: 50,
          sessionSequence: 1,
          patient: { id: 'pat-1', user: { name: 'Lucas' } },
        }),
      },
      clinicalRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rec-1',
          isSigned: true,
          signedAt: new Date(),
          sessionSequence: 1,
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
      service.saveScales(
        'appt-1',
        { scales: [{ name: 'Humor', value: 7 }] },
        doctorActor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('salva escalas com observação cifrada e registra auditoria', async () => {
    const createScale = jest.fn().mockResolvedValue({});
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
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
          sessionSequence: 2,
          patient: { id: 'pat-1', user: { name: 'Lucas' } },
        }),
      },
      clinicalRecord: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'rec-1',
          isSigned: false,
          signedAt: null,
          sessionSequence: 2,
        }),
      },
      sessionScale: {
        deleteMany,
        create: createScale,
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

    const result = await service.saveScales(
      'appt-1',
      {
        scales: [
          { name: 'Humor', value: 8, observation: 'Melhora no sono' },
          { name: 'Ansiedade', value: 4 },
        ],
      },
      doctorActor,
    );

    expect(deleteMany).toHaveBeenCalledWith({ where: { recordId: 'rec-1' } });
    expect(createScale).toHaveBeenCalledTimes(2);
    expect(encrypt).toHaveBeenCalledWith(
      'Melhora no sono',
      expect.stringContaining('session_scale:'),
    );
    expect(result.scales).toHaveLength(2);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'session_scale.save' }),
      tx,
    );
  });
});
