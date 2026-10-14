import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@lepera/contracts';
import { ROLES_KEY, STRICT_ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from './jwt-auth.guard';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const targets = [ctx.getHandler(), ctx.getClass()];
    const required = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      targets,
    );
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) return false;

    if (user.role === 'SUPER_ADMIN') {
      const strict = this.reflector.getAllAndOverride<boolean>(
        STRICT_ROLES_KEY,
        targets,
      );
      if (!strict) return true;
    }

    return required.includes(user.role);
  }
}
