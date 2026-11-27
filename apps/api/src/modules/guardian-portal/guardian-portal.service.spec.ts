import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from '../users/password.service';
import { GuardianPortalService } from './guardian-portal.service';

describe('GuardianPortalService (PRI-12 + PRI-10)', () => {
  const guardianActor: AuthUser = { sub: 'guardian-1', role: 'GUARDIAN' };
  const crypto = new EncryptionService({
    getOrThrow: () => 'f'.repeat(64),
  } as unknown as ConfigService);

  let service: GuardianPortalService;
  let userCreate: jest.Mock;
  let patientCreate: jest.Mock;
  let patientFindFirst: jest.Mock;
  let linkFindFirst: jest.Mock;
  let linkCreate: jest.Mock;
  let docFindMany: jest.Mock;
  let docFindFirst: jest.Mock;
  let auditLog: jest.Mock;

  beforeEach(() => {
    userCreate = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'guardian-1',
        name: 'Ana Responsável',
        email: 'ana@resp.test',
        role: 'GUARDIAN',
        sessionVersion: 0,
      })
      .mockResolvedValueOnce({ id: 'child-user-1', name: 'Pedro Menor' });
    patientCreate = jest.fn().mockResolvedValue({ id: 'child-pat-1' });
    patientFindFirst = jest.fn().mockResolvedValue(null);
    linkFindFirst = jest.fn().mockResolvedValue({ id: 'link-1' });
    linkCreate = jest.fn().mockResolvedValue({ id: 'link-1' });
    docFindMany = jest.fn().mockResolvedValue([]);
    docFindFirst = jest.fn().mockResolvedValue(null);
    auditLog = jest.fn().mockResolvedValue({});

    const db: Record<string, unknown> = {
      user: { create: userCreate, findUnique: jest.fn() },
      patient: {
        create: patientCreate,
        findFirst: patientFindFirst,
        findUnique: jest.fn(),
      },
      guardianPatient: {
        findFirst: linkFindFirst,
        findMany: jest.fn().mockResolvedValue([]),
        create: linkCreate,
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      clinicalDocument: { findMany: docFindMany, findFirst: docFindFirst },
      $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) => cb(db)),
    };

    service = new GuardianPortalService(
      { db } as unknown as PrismaService,
      {
        hash: jest.fn().mockResolvedValue('hashed'),
      } as unknown as PasswordService,
      crypto,
      { log: auditLog } as unknown as AuditService,
    );
  });

  const validDto = () => ({
    name: 'Ana Responsável',
    email: 'ana@resp.test',
    password: 'Password@123',
    cpf: '52998224725',
    birthDate: '1988-05-10',
    phone: '11988887777',
    dependent: {
      name: 'Pedro Menor',
      cpf: '11144477735',
      birthDate: `${new Date().getUTCFullYear() - 10}-03-15`,
      relationship: 'Mãe',
    },
  });

  it('rejeita CPFs iguais entre responsável e dependente', async () => {
    const dto = validDto();
    dto.dependent.cpf = dto.cpf;
    await expect(service.registerGuardian(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('rejeita dependente maior de 18 anos no cadastro de responsável', async () => {
    const dto = validDto();
    dto.dependent.birthDate = '1995-01-01';
    await expect(service.registerGuardian(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('cria responsável (loginEnabled=true) e dependente (loginEnabled=false, sem email/senha) atomicamente', async () => {
    const guardian = await service.registerGuardian(validDto());
    expect(guardian.role).toBe('GUARDIAN');
    expect(userCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'GUARDIAN',
          loginEnabled: true,
        }) as unknown,
      }),
    );
    expect(userCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          role: 'PATIENT',
          loginEnabled: false,
          email: null,
          passwordHash: null,
        }) as unknown,
      }),
    );
  });

  it('não vincula CPF existente automaticamente (converte P2002 em 409)', async () => {
    userCreate.mockReset();
    userCreate.mockRejectedValue({ code: 'P2002' });
    await expect(service.registerGuardian(validDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('bloqueia acesso a dependente sem vínculo ativo (404)', async () => {
    linkFindFirst.mockResolvedValue(null);
    await expect(
      service.listGuardianFeedback('foreign-child', guardianActor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(docFindMany).not.toHaveBeenCalled();
  });

  it('filtra devolutivas exclusivamente para GUARDIAN_FEEDBACK + SIGNED + GUARDIAN_RELEASED', async () => {
    await service.listGuardianFeedback('child-pat-1', guardianActor);
    expect(docFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          patientId: 'child-pat-1',
          type: 'GUARDIAN_FEEDBACK',
          status: 'SIGNED',
          visibility: 'GUARDIAN_RELEASED',
        },
      }),
    );
  });
});
