import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let verifyAsync: jest.Mock;
  let userFindUnique: jest.Mock;
  let guard: JwtAuthGuard;

  function contextWith(headers: Record<string, string>) {
    const req: { headers: Record<string, string>; user?: unknown } = {
      headers,
    };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req }),
    } as unknown as ExecutionContext;
    return { ctx, req };
  }

  beforeEach(() => {
    verifyAsync = jest
      .fn()
      .mockResolvedValue({ sub: 'user-1', role: 'PATIENT' });
    userFindUnique = jest
      .fn()
      .mockResolvedValue({ isActive: true, role: 'PATIENT' });

    guard = new JwtAuthGuard(
      { verifyAsync } as unknown as JwtService,
      {
        db: { user: { findUnique: userFindUnique } },
      } as unknown as PrismaService,
    );
  });

  it('aceita token válido de conta ativa e preenche req.user', async () => {
    const { ctx, req } = contextWith({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ sub: 'user-1', role: 'PATIENT' });
  });

  it('usa o perfil ATUAL do banco, não o do token', async () => {
    userFindUnique.mockResolvedValue({ isActive: true, role: 'RECEPTIONIST' });
    const { ctx, req } = contextWith({ authorization: 'Bearer abc' });

    await guard.canActivate(ctx);

    expect(req.user).toEqual({ sub: 'user-1', role: 'RECEPTIONIST' });
  });

  it('recusa conta desativada mesmo com token válido', async () => {
    userFindUnique.mockResolvedValue({ isActive: false, role: 'PATIENT' });
    const { ctx } = contextWith({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('recusa usuário que não existe mais', async () => {
    userFindUnique.mockResolvedValue(null);
    const { ctx } = contextWith({ authorization: 'Bearer abc' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('recusa token ausente, malformado ou inválido', async () => {
    await expect(guard.canActivate(contextWith({}).ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      guard.canActivate(contextWith({ authorization: 'Basic abc' }).ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    verifyAsync.mockRejectedValue(new Error('expired'));
    await expect(
      guard.canActivate(contextWith({ authorization: 'Bearer abc' }).ctx),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});
