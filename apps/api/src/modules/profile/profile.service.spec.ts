import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProfileService } from './profile.service';

describe('ProfileService.changePassword', () => {
  const user = { sub: 'user-1', role: 'PATIENT' as const };

  let service: ProfileService;
  let userFindUnique: jest.Mock;
  let userUpdate: jest.Mock;
  let verify: jest.Mock;
  let auditLog: jest.Mock;

  beforeEach(() => {
    userFindUnique = jest.fn().mockResolvedValue({ passwordHash: 'old-hash' });
    userUpdate = jest.fn().mockResolvedValue({});
    verify = jest.fn().mockResolvedValue(true);
    auditLog = jest.fn().mockResolvedValue({});

    const db = {
      user: { findUnique: userFindUnique, update: userUpdate },
      $transaction: jest.fn(
        (callback: (client: unknown) => Promise<unknown>): Promise<unknown> =>
          callback(db),
      ),
    };

    service = new ProfileService(
      { db } as unknown as PrismaService,
      {
        verify,
        hash: jest.fn().mockResolvedValue('new-hash'),
      },
      { log: auditLog } as unknown as AuditService,
    );
  });

  it('troca a senha, grava o novo hash e audita sem expor a senha', async () => {
    await expect(
      service.changePassword(user, {
        currentPassword: 'Antiga@123',
        newPassword: 'Nova@12345',
      }),
    ).resolves.toEqual({ ok: true });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'new-hash' },
    });
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'user.password_change' }),
      expect.anything(),
    );
    expect(JSON.stringify(auditLog.mock.calls)).not.toContain('Nova@12345');
  });

  it('recusa quando a senha atual está errada', async () => {
    verify.mockResolvedValue(false);

    await expect(
      service.changePassword(user, {
        currentPassword: 'errada',
        newPassword: 'Nova@12345',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('recusa nova senha igual à atual', async () => {
    await expect(
      service.changePassword(user, {
        currentPassword: 'Mesma@12345',
        newPassword: 'Mesma@12345',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('responde 404 se o usuário não existe mais', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(
      service.changePassword(user, {
        currentPassword: 'x',
        newPassword: 'Nova@12345',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
