import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard, type RateLimitOptions } from './rate-limit.guard';

function guardWith(options: RateLimitOptions | undefined) {
  return new RateLimitGuard({
    get: () => options,
  } as unknown as Reflector);
}

function contextFor(req: { ip?: string; body?: { email?: string } }) {
  return {
    getHandler: () => () => undefined,
    switchToHttp: () => ({ getRequest: () => req }),
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

  it('libera rotas sem @RateLimit', () => {
    expect(
      guardWith(undefined).canActivate(contextFor({ ip: '1.1.1.1' })),
    ).toBe(true);
  });

  it('bloqueia (429) depois do limite por IP', () => {
    const guard = guardWith(options);
    const ctx = contextFor({ ip: '1.1.1.1' });

    for (let i = 0; i < 3; i++) expect(guard.canActivate(ctx)).toBe(true);

    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    try {
      guard.canActivate(ctx);
    } catch (error) {
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });

  it('IPs diferentes têm contagens independentes', () => {
    const guard = guardWith(options);
    for (let i = 0; i < 3; i++)
      guard.canActivate(contextFor({ ip: '1.1.1.1' }));

    expect(guard.canActivate(contextFor({ ip: '2.2.2.2' }))).toBe(true);
  });

  it('limita por e-mail mesmo vindo de IPs diferentes (sem diferenciar maiúsculas)', () => {
    const guard = guardWith(options);
    guard.canActivate(
      contextFor({ ip: '1.1.1.1', body: { email: 'A@x.com' } }),
    );
    guard.canActivate(
      contextFor({ ip: '2.2.2.2', body: { email: 'a@x.com' } }),
    );
    guard.canActivate(
      contextFor({ ip: '3.3.3.3', body: { email: ' a@X.com ' } }),
    );

    expect(() =>
      guard.canActivate(
        contextFor({ ip: '4.4.4.4', body: { email: 'a@x.com' } }),
      ),
    ).toThrow(HttpException);
  });

  it('a janela expira e libera de novo', () => {
    const guard = guardWith(options);
    const ctx = contextFor({ ip: '1.1.1.1' });
    for (let i = 0; i < 3; i++) guard.canActivate(ctx);
    expect(() => guard.canActivate(ctx)).toThrow(HttpException);

    jest.advanceTimersByTime(60_001);

    expect(guard.canActivate(ctx)).toBe(true);
  });
});
