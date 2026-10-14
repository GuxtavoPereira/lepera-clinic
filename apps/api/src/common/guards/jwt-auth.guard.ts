import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@lepera/contracts';
import { PrismaService } from '../../prisma/prisma.service';

export type AuthUser = { sub: string; role: Role };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;

      user?: AuthUser;
    }>();

    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token ausente');
    }

    let payload: AuthUser;
    try {
      payload = await this.jwt.verifyAsync<AuthUser>(token);
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    // O token vale por 8 h, mas a conta pode ter sido desativada (ou ter
    // mudado de perfil) nesse intervalo: confere no banco a cada requisição.
    const account = await this.prisma.db.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, role: true },
    });
    if (!account || !account.isActive) {
      throw new UnauthorizedException('Conta desativada ou inexistente');
    }

    req.user = { sub: payload.sub, role: account.role };
    return true;
  }
}
