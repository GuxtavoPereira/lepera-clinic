import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import { PasswordService } from '../users/password.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  /** Dados do usuário logado + o perfil do papel (paciente/médico/recepção). */
  async getMe(user: AuthUser) {
    const me = await this.prisma.db.user.findUnique({
      where: { id: user.sub },
      omit: { passwordHash: true },
      include: {
        doctor: true,
        receptionist: true,
        patient: {
          include: {
            phones: { orderBy: { createdAt: 'asc' } },
            addresses: { orderBy: { createdAt: 'asc' }, take: 1 },
            responsibleDoctor: {
              select: { user: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!me) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return me;
  }

  async changePassword(
    user: AuthUser,
    dto: ChangePasswordDto,
    ctx: RequestContext = {},
  ) {
    const record = await this.prisma.db.user.findUnique({
      where: { id: user.sub },
      select: { passwordHash: true },
    });
    if (!record) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (
      !(await this.passwords.verify(dto.currentPassword, record.passwordHash))
    ) {
      throw new BadRequestException('Senha atual incorreta');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }

    const passwordHash = await this.passwords.hash(dto.newPassword);

    await this.prisma.db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.sub }, data: { passwordHash } });
      await this.audit.log(
        {
          actor: user,
          action: 'user.password_change',
          resource: 'User',
          resourceId: user.sub,
          ...ctx,
        },
        tx,
      );
    });

    return { ok: true };
  }
}
