import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GuidanceMessagesService } from './guidance-messages.service';

describe('GuidanceMessagesService (PRI-09)', () => {
  const doctorUser = { sub: 'doc-user', role: 'DOCTOR' as const };
  const patientUser = { sub: 'pat-user', role: 'PATIENT' as const };
  const crypto = new EncryptionService({
    getOrThrow: () => 'e'.repeat(64),
  } as unknown as ConfigService);

  let service: GuidanceMessagesService;
  let doctorFindUnique: jest.Mock;
  let patientFindFirst: jest.Mock;
  let patientFindUnique: jest.Mock;
  let appointmentFindFirst: jest.Mock;
  let appointmentUpdate: jest.Mock;
  let msgCreate: jest.Mock;
  let msgFindFirst: jest.Mock;
  let msgUpdate: jest.Mock;
  let notifCreate: jest.Mock;
  let auditLog: jest.Mock;

  beforeEach(() => {
    doctorFindUnique = jest.fn().mockResolvedValue({
      id: 'doctor-1',
      user: { name: 'Dr. Roberto Silva' },
    });
    patientFindFirst = jest
      .fn()
      .mockResolvedValue({ id: 'patient-1', userId: 'pat-user' });
    patientFindUnique = jest.fn().mockResolvedValue({ id: 'patient-1' });
    appointmentFindFirst = jest.fn().mockResolvedValue({ id: 'appt-1' });
    appointmentUpdate = jest.fn();
    msgCreate = jest.fn(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...data,
        readAt: null,
        createdAt: new Date('2026-11-27T18:00:00Z'),
        doctor: {
          specialty: 'Psicologia Clínica',
          user: { name: 'Dr. Roberto Silva' },
        },
        patient: { userId: 'pat-user', user: { name: 'Lucas Pereira' } },
      }),
    );
    msgFindFirst = jest.fn().mockResolvedValue(null);
    msgUpdate = jest.fn();
    notifCreate = jest.fn().mockResolvedValue({ id: 'notif-1' });
    auditLog = jest.fn().mockResolvedValue({});

    const db: Record<string, unknown> = {
      doctor: { findUnique: doctorFindUnique },
      patient: { findFirst: patientFindFirst, findUnique: patientFindUnique },
      appointment: {
        findFirst: appointmentFindFirst,
        update: appointmentUpdate,
      },
      patientGuidanceMessage: {
        create: msgCreate,
        findFirst: msgFindFirst,
        findMany: jest.fn().mockResolvedValue([]),
        update: msgUpdate,
      },
      notification: { create: notifCreate },
      $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) => cb(db)),
    };

    service = new GuidanceMessagesService(
      { db } as unknown as PrismaService,
      crypto,
      { log: auditLog } as unknown as AuditService,
    );
  });

  it('cifra a mensagem, cria notificação sem vazar o corpo e não altera estado da consulta', async () => {
    const result = await service.send(
      {
        patientId: 'patient-1',
        appointmentId: 'appt-1',
        category: 'CANCELLATION_NOTICE',
        subject: 'Reagendamento necessário',
        body: 'Orientações privadas de remarcação e exercício respiratório.',
      },
      doctorUser,
    );

    const createdData = (
      msgCreate.mock.calls[0] as [{ data: Record<string, string> }]
    )[0].data;
    expect(createdData.body).toMatch(/^v1:/);
    expect(createdData.body).not.toContain('respiratório');
    expect(result.body).toBe(
      'Orientações privadas de remarcação e exercício respiratório.',
    );

    // Notificação interna não vaza o texto clínico
    const notifData = (
      notifCreate.mock.calls[0] as [{ data: { message: string } }]
    )[0].data;
    expect(notifData.message).not.toContain('respiratório');

    // Mensagem de desmarcação NÃO altera o estado da consulta
    expect(appointmentUpdate).not.toHaveBeenCalled();
  });

  it('recusa envio para paciente sem vínculo (404)', async () => {
    patientFindFirst.mockResolvedValue(null);
    await expect(
      service.send(
        {
          patientId: 'other-patient',
          category: 'POST_SESSION',
          subject: 'Orientações',
          body: 'Texto de teste.',
        },
        doctorUser,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(msgCreate).not.toHaveBeenCalled();
  });

  it('impede paciente de marcar mensagem de outro paciente como lida (404)', async () => {
    msgFindFirst.mockResolvedValue(null);
    await expect(
      service.markRead('foreign-msg', patientUser),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(msgUpdate).not.toHaveBeenCalled();
  });
});
