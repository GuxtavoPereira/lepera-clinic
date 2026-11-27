import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service';
import { RateLimitGuard, type RateLimitOptions } from './rate-limit.guard';

function guardWith(
  options: RateLimitOptions | undefined,
  prisma?: PrismaService,
) {
  return new RateLimitGuard(
    {
      get: () => options,
    } as unknown as Reflector,
    prisma,
  );
}

function contextFor(
  req: { ip?: string; body?: { email?: string } },
  setHeader = jest.fn(),
) {
  return {
    getHandler: () => () => undefined,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  const options: RateLimitOptions = {
    name: 'login',
    limit: 3,
    windowMs: 60_000,
    byEmail: true,
  };

  beforeEach(() => {
    RateLimitGuard.reset();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-13T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('libera rotas sem @RateLimit', async () => {
    await expect(
      guardWith(undefined).canActivate(contextFor({ ip: '1.1.1.1' })),
    ).resolves.toBe(true);
  });

  it('bloqueia (429) depois do limite por IP e envia Retry-After', async () => {
    const guard = guardWith(options);
    const setHeader = jest.fn();
    const ctx = contextFor({ ip: '1.1.1.1' }, setHeader);

    for (let i = 0; i < 3; i++) {
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
    }

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);
    try {
      await guard.canActivate(ctx);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });

  it('IPs diferentes têm contagens independentes', async () => {
    const guard = guardWith(options);
    for (let i = 0; i < 3; i++) {
      await guard.canActivate(contextFor({ ip: '1.1.1.1' }));
    }

    await expect(
      guard.canActivate(contextFor({ ip: '2.2.2.2' })),
    ).resolves.toBe(true);
  });

  it('limita por e-mail mesmo vindo de IPs diferentes (sem diferenciar maiúsculas)', async () => {
    const guard = guardWith(options);
    await guard.canActivate(
      contextFor({ ip: '1.1.1.1', body: { email: 'A@x.com' } }),
    );
    await guard.canActivate(
      contextFor({ ip: '2.2.2.2', body: { email: 'a@x.com' } }),
    );
    await guard.canActivate(
      contextFor({ ip: '3.3.3.3', body: { email: ' a@X.com ' } }),
    );

    await expect(
      guard.canActivate(
        contextFor({ ip: '4.4.4.4', body: { email: 'a@x.com' } }),
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('a janela expira e libera de novo', async () => {
    const guard = guardWith(options);
    const ctx = contextFor({ ip: '1.1.1.1' });
    for (let i = 0; i < 3; i++) await guard.canActivate(ctx);
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(HttpException);

    jest.advanceTimersByTime(60_001);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('SEC-02: usa upsert atômico no PostgreSQL com chave hasheada sem expor e-mail em texto claro', async () => {
    const queryRaw = jest
      .fn()
      .mockResolvedValue([
        { count: 4, resetAt: new Date('2026-10-13T12:01:00.000Z') },
      ]);
    const prisma = {
      db: {
        $queryRaw: queryRaw,
        rateLimitBucket: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      },
    } as unknown as PrismaService;

    const guard = guardWith(options, prisma);
    const setHeader = jest.fn();

    await expect(
      guard.canActivate(
        contextFor(
          { ip: '10.0.0.1', body: { email: 'sigilo@clinica.com' } },
          setHeader,
        ),
      ),
    ).rejects.toBeInstanceOf(HttpException);

    expect(queryRaw).toHaveBeenCalledTimes(1);
    const serialized = JSON.stringify(queryRaw.mock.calls);
    expect(serialized).not.toContain('sigilo@clinica.com');
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });
});
