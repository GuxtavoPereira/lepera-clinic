import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../users/password.service';
import {
  PasswordRecoveryService,
  RECOVERY_MESSAGE,
  RecoveryMailer,
} from './password-recovery.service';

describe('Password recovery', () => {
  let userFind: jest.Mock;
  let userUpdate: jest.Mock;
  let create: jest.Mock;
  let tokenFind: jest.Mock;
  let claim: jest.Mock;
  let send: jest.Mock;
  let hash: jest.Mock;
  let configured: jest.Mock;
  let service: PasswordRecoveryService;
  beforeEach(() => {
    userFind = jest.fn().mockResolvedValue({ id: 'u', isActive: true });
    userUpdate = jest.fn().mockResolvedValue({ count: 1 });
    create = jest.fn().mockResolvedValue({ id: 't' });
    tokenFind = jest.fn();
    claim = jest.fn().mockResolvedValue({ count: 1 });
    send = jest.fn().mockResolvedValue(undefined);
    hash = jest.fn().mockResolvedValue('bcrypt-hash');
    configured = jest.fn().mockReturnValue(true);
    const db = {
      user: { findUnique: userFind, updateMany: userUpdate },
      passwordResetToken: {
        create,
        findUnique: tokenFind,
        update: jest.fn(),
        updateMany: claim,
      },
      $transaction: jest.fn(
        (cb: (tx: unknown) => Promise<unknown>): Promise<unknown> => cb(db),
      ),
    };
    service = new PasswordRecoveryService(
      { db } as unknown as PrismaService,
      { hash } as unknown as PasswordService,
      new ConfigService({ WEB_URL: 'https://clinic.example.test' }),
      { send, configured } as unknown as RecoveryMailer,
    );
  });
  it('stores only a digest and sends the raw secret exclusively in the e-mail link', async () => {
    const response = await service.forgot('owner@example.test');
    expect(response).toEqual({ message: RECOVERY_MESSAGE });
    const sent = send.mock.calls as [string, string][];
    const link = new URL(sent[0][1]);
    const raw = link.searchParams.get('token')!;
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(link.origin).toBe('https://clinic.example.test');
    const stored = create.mock.calls as [{ data: { tokenHash: string } }][];
    expect(stored[0][0].data.tokenHash).toBe(
      createHash('sha256').update(raw).digest('hex'),
    );
    expect(JSON.stringify(create.mock.calls)).not.toContain(raw);
    expect(JSON.stringify(response)).not.toContain(raw);
  });
  it('returns the same response for unknown or inactive accounts', async () => {
    userFind.mockResolvedValue(null);
    expect(await service.forgot('unknown@example.test')).toEqual({
      message: RECOVERY_MESSAGE,
    });
    userFind.mockResolvedValue({ id: 'u', isActive: false });
    expect(await service.forgot('inactive@example.test')).toEqual({
      message: RECOVERY_MESSAGE,
    });
    expect(send).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
  it('does not pretend delivery is configured', async () => {
    configured.mockReturnValue(false);
    await expect(service.forgot('owner@example.test')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(userFind).not.toHaveBeenCalled();
  });
  it.each([
    null,
    {
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 10000),
      user: { isActive: true },
    },
    { usedAt: null, expiresAt: new Date(0), user: { isActive: true } },
    {
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      user: { isActive: false },
    },
  ])(
    'rejects missing, used, expired, or inactive credentials',
    async (record) => {
      tokenFind.mockResolvedValue(record);
      await expect(service.reset('raw', 'New@12345')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(userUpdate).not.toHaveBeenCalled();
    },
  );
  it('claims once, invalidates other links, and revokes all older sessions atomically', async () => {
    tokenFind.mockResolvedValue({
      id: 't',
      userId: 'u',
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      user: { isActive: true },
    });
    await expect(service.reset('raw', 'New@12345')).resolves.toMatchObject({
      message: expect.any(String) as unknown,
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'u', isActive: true },
      data: { passwordHash: 'bcrypt-hash', sessionVersion: { increment: 1 } },
    });
    expect(claim).toHaveBeenCalledTimes(2);
    claim.mockResolvedValue({ count: 0 });
    userUpdate.mockClear();
    await expect(service.reset('raw', 'New@12345')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(userUpdate).not.toHaveBeenCalled();
  });
});
