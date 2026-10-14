import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ClinicalRecordsService } from './clinical-records.service';

describe('ClinicalRecordsService (RN02 / RNF01 / RF12)', () => {
  const doctorUser = { sub: 'doctor-user', role: 'DOCTOR' as const };
  const crypto = new EncryptionService({
    getOrThrow: () => 'c'.repeat(64),
  } as unknown as ConfigService);

  let service: ClinicalRecordsService;
  let doctorFindUnique: jest.Mock;
  let appointmentFindUnique: jest.Mock;
  let appointmentUpdate: jest.Mock;
  let recordFindUnique: jest.Mock;
  let recordCreate: jest.Mock;
  let recordUpdate: jest.Mock;
  let recordCount: jest.Mock;
  let auditLog: jest.Mock;

  function appointment(overrides: Record<string, unknown> = {}) {
    return {
      id: 'appointment-1',
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      status: 'SCHEDULED',
      startDatetime: new Date('2026-10-20T13:00:00.000Z'),
      durationMinutes: 50,
      sessionSequence: null,
      patient: { id: 'patient-1', user: { name: 'Lucas Pereira' } },
      ...overrides,
    };
  }

  beforeEach(() => {
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    appointmentFindUnique = jest.fn().mockResolvedValue(appointment());
    appointmentUpdate = jest.fn().mockResolvedValue({});
    recordFindUnique = jest.fn().mockResolvedValue(null);
    recordCount = jest.fn().mockResolvedValue(2);
    recordCreate = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        isSigned: false,
        signedAt: null,
        updatedAt: new Date(),
        mainComplaint: null,
        clinicalNotes: null,
        homework: null,
        diagnosticHypothesis: null,
        cid10: null,
        dsm5: null,
        approachUsed: null,
        therapeuticPlan: null,
        nextSessionDate: null,
        nextSessionRoom: null,
        ...data,
      }),
    );
    recordUpdate = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: 'record-1',
        isSigned: false,
        signedAt: null,
        sessionSequence: 1,
        updatedAt: new Date(),
        mainComplaint: null,
        clinicalNotes: null,
        homework: null,
        diagnosticHypothesis: null,
        cid10: null,
        dsm5: null,
        approachUsed: null,
        therapeuticPlan: null,
        nextSessionDate: null,
        nextSessionRoom: null,
        ...data,
      }),
    );
    auditLog = jest.fn().mockResolvedValue({});

    const db = {
      doctor: { findUnique: doctorFindUnique },
      appointment: {
        findUnique: appointmentFindUnique,
        update: appointmentUpdate,
      },
      clinicalRecord: {
        findUnique: recordFindUnique,
        create: recordCreate,
        update: recordUpdate,
        count: recordCount,
      },
      $transaction: jest.fn((callback: (client: unknown) => Promise<unknown>) =>
        callback(db),
      ),
    };

    service = new ClinicalRecordsService(
      { db } as unknown as PrismaService,
      crypto,
      { log: auditLog } as unknown as AuditService,
    );
  });

  it('grava os campos clínicos CIFRADOS e devolve o texto original', async () => {
    const notes = 'Paciente relata picos de ansiedade no trabalho.';

    const result = await service.save(
      'appointment-1',
      { clinicalNotes: notes, cid10: 'F41.1' },
      doctorUser,
    );

    const stored = (
      recordCreate.mock.calls[0] as [{ data: Record<string, string> }]
    )[0].data;
    expect(stored.clinicalNotes.startsWith('v1:')).toBe(true);
    expect(stored.clinicalNotes).not.toContain('ansiedade');
    expect(stored.cid10).not.toContain('F41');

    expect(result.record.clinicalNotes).toBe(notes);
    expect(result.record.cid10).toBe('F41.1');
    expect(result.record.sessionSequence).toBe(3);
    expect(result.appointment.patient.name).toBe('Lucas Pereira');
  });

  it('audita a criação só com os NOMES dos campos, nunca o conteúdo', async () => {
    await service.save(
      'appointment-1',
      { clinicalNotes: 'conteúdo secreto' },
      doctorUser,
    );

    expect(auditLog).toHaveBeenCalledTimes(1);
    const [entry] = auditLog.mock.calls[0] as [
      { action: string; metadata: unknown },
    ];
    expect(entry.action).toBe('clinical_record.create');
    expect(entry.metadata).toEqual({ fields: ['clinicalNotes'] });
    expect(JSON.stringify(entry)).not.toContain('secreto');
  });

  it('RN02: consulta de outro profissional responde 404', async () => {
    appointmentFindUnique.mockResolvedValue(
      appointment({ doctorId: 'doctor-2' }),
    );

    await expect(
      service.save('appointment-1', { clinicalNotes: 'x' }, doctorUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getByAppointment('appointment-1', doctorUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(recordCreate).not.toHaveBeenCalled();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('leitura de prontuário existente decifra e registra a leitura', async () => {
    const stored = crypto.encrypt(
      'Evolução da sessão',
      'clinical_record:record-1:clinicalNotes',
    );
    recordFindUnique.mockResolvedValue({
      id: 'record-1',
      isSigned: false,
      signedAt: null,
      sessionSequence: 1,
      updatedAt: new Date(),
      mainComplaint: null,
      clinicalNotes: stored,
      homework: null,
      diagnosticHypothesis: null,
      cid10: null,
      dsm5: null,
      approachUsed: null,
      therapeuticPlan: null,
      nextSessionDate: null,
      nextSessionRoom: null,
    });

    const result = await service.getByAppointment('appointment-1', doctorUser);

    expect(result.record?.clinicalNotes).toBe('Evolução da sessão');
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'clinical_record.read',
        resourceId: 'record-1',
      }),
    );
  });

  it('sem prontuário ainda: devolve record nulo e não audita leitura', async () => {
    const result = await service.getByAppointment('appointment-1', doctorUser);

    expect(result.record).toBeNull();
    expect(auditLog).not.toHaveBeenCalled();
  });

  it('prontuário assinado não pode mais ser alterado', async () => {
    recordFindUnique.mockResolvedValue({ id: 'record-1', isSigned: true });

    await expect(
      service.save('appointment-1', { clinicalNotes: 'novo' }, doctorUser),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(recordUpdate).not.toHaveBeenCalled();
  });

  it('recusa registrar prontuário de consulta cancelada', async () => {
    appointmentFindUnique.mockResolvedValue(
      appointment({ status: 'CANCELLED' }),
    );

    await expect(
      service.save('appointment-1', { clinicalNotes: 'x' }, doctorUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('assinar exige prontuário salvo com evolução clínica', async () => {
    await expect(
      service.sign('appointment-1', doctorUser),
    ).rejects.toBeInstanceOf(NotFoundException);

    recordFindUnique.mockResolvedValue({
      id: 'record-1',
      isSigned: false,
      clinicalNotes: null,
    });
    await expect(
      service.sign('appointment-1', doctorUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assinar trava o prontuário, conclui a consulta e audita', async () => {
    recordFindUnique.mockResolvedValue({
      id: 'record-1',
      isSigned: false,
      clinicalNotes: crypto.encrypt(
        'ok',
        'clinical_record:record-1:clinicalNotes',
      ),
    });
    recordUpdate.mockResolvedValue({
      id: 'record-1',
      isSigned: true,
      signedAt: new Date(),
      sessionSequence: 1,
      updatedAt: new Date(),
      mainComplaint: null,
      clinicalNotes: null,
      homework: null,
      diagnosticHypothesis: null,
      cid10: null,
      dsm5: null,
      approachUsed: null,
      therapeuticPlan: null,
      nextSessionDate: null,
      nextSessionRoom: null,
    });

    const result = await service.sign('appointment-1', doctorUser);

    expect(recordUpdate).toHaveBeenCalledWith({
      where: { id: 'record-1' },
      data: { isSigned: true, signedAt: expect.any(Date) },
    });
    expect(appointmentUpdate).toHaveBeenCalledWith({
      where: { id: 'appointment-1' },
      data: { status: 'COMPLETED' },
    });
    expect(result.record.isSigned).toBe(true);
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'clinical_record.sign' }),
      expect.anything(),
    );
  });

  it('assinar duas vezes responde conflito', async () => {
    recordFindUnique.mockResolvedValue({ id: 'record-1', isSigned: true });

    await expect(
      service.sign('appointment-1', doctorUser),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
