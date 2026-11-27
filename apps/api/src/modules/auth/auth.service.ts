import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { GuardianPortalService } from '../guardian-portal/guardian-portal.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from '../users/password.service';
import { PatientsService } from '../patients/patients.service';
import { RegisterGuardianDto } from './dto/register-guardian.dto';
import { RegisterPatientDto } from './dto/register.dto';

type SessionUser = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  sessionVersion?: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly patients: PatientsService,
    private readonly guardianPortal: GuardianPortalService,
    @Optional() private readonly audit?: AuditService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithPassword(email);
    if (
      !user ||
      user.loginEnabled === false ||
      !user.passwordHash ||
      !user.email
    ) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const passwordOk = await this.passwords.verify(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário desativado');
    }

    return this.issueToken(user);
  }

  /** Cadastro público: cria o paciente e já devolve a sessão (auto-login). */
  async register(dto: RegisterPatientDto) {
    const created = await this.patients.create(dto);
    return this.issueToken(created);
  }

  /** Cadastro público do responsável + dependente menor sem login próprio. */
  async registerGuardian(dto: RegisterGuardianDto, ctx: RequestContext = {}) {
    const created = await this.guardianPortal.registerGuardian(dto, ctx);
    return this.issueToken(created);
  }

  /** SEC-01: revoga a sessão no servidor incrementando `sessionVersion`. */
  async logout(user: AuthUser, ctx: RequestContext = {}) {
    await this.users.revokeSessions(user.sub);
    if (this.audit) {
      await this.audit.log({
        actor: user,
        action: 'user.logout',
        resource: 'User',
        resourceId: user.sub,
        ...ctx,
      });
    }
    return { ok: true };
  }

  private async issueToken(user: SessionUser) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      sessionVersion: user.sessionVersion ?? 0,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
