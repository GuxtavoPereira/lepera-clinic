// apps/api/src/modules/users/users.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { PasswordService } from './password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { DbClient } from '../../prisma/prisma.types';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async create(dto: CreateUserDto, db: DbClient = this.prisma.db) {
    const passwordHash = await this.passwords.hash(dto.password);

    return db.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
      omit: { passwordHash: true },
    });
  }

  async createWithProfile(dto: CreateUserDto, actor: AuthUser) {
    if (dto.role === 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Apenas o super administrador pode criar administradores',
      );
    }

    if (dto.role === 'DOCTOR' && (!dto.licenseNumber || !dto.specialty)) {
      throw new BadRequestException(
        'Profissional exige registro (CRP/CRM) e especialidade',
      );
    }

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const user = await this.create(dto, tx);

        switch (dto.role) {
          case 'DOCTOR':
            await tx.doctor.create({
              data: {
                userId: user.id,
                licenseNumber: dto.licenseNumber!,
                specialty: dto.specialty!,
              },
            });
            break;
          case 'PATIENT':
            await tx.patient.create({ data: { userId: user.id } });
            break;
          case 'RECEPTIONIST':
            await tx.receptionist.create({ data: { userId: user.id } });
            break;
          case 'ADMIN':
            break;
        }

        return user;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe um usuário com este e-mail');
      }
      throw error;
    }
  }

  findAll(actor: AuthUser) {
    return this.prisma.db.user.findMany({
      where:
        actor.role === 'SUPER_ADMIN'
          ? undefined
          : { role: { not: 'SUPER_ADMIN' } },
      omit: { passwordHash: true },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string, actor: AuthUser) {
    return this.prisma.db.user.findFirst({
      where: {
        id,
        ...(actor.role === 'SUPER_ADMIN'
          ? {}
          : { role: { not: 'SUPER_ADMIN' } }),
      },
      omit: { passwordHash: true },
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    await this.assertCanManage(actor, id, 'update');

    return this.prisma.db.user.update({
      where: { id },
      data: dto,
      omit: { passwordHash: true },
    });
  }

  async deactivate(id: string, actor: AuthUser) {
    await this.assertCanManage(actor, id, 'deactivate');

    return this.prisma.db.user.update({
      where: { id },
      data: { isActive: false },
      omit: { passwordHash: true },
    });
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.db.user.findUnique({ where: { email } });
  }

  private async assertCanManage(
    actor: AuthUser,
    targetId: string,
    action: 'update' | 'deactivate',
  ) {
    const target = await this.prisma.db.user.findUnique({
      where: { id: targetId },
      select: { role: true },
    });

    if (!target) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (actor.role === 'SUPER_ADMIN') {
      if (action === 'deactivate' && target.role === 'SUPER_ADMIN') {
        throw new ForbiddenException(
          'O super administrador não pode ser desativado pela API',
        );
      }
      return;
    }

    if (target.role === 'ADMIN' || target.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Apenas o super administrador gerencia administradores',
      );
    }
  }
}
