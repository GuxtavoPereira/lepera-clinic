// apps/api/src/modules/users/users.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { isValidCpf } from '../../common/utils/cpf';
import { parseBirthDate } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { PasswordService } from './password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { DbClient } from '../../prisma/prisma.types';

type PersonalData = { name?: string; cpf?: string; birthDate?: string };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /** Cria somente o User. Usado pelos services de Doctor/Patient/Receptionist,
   *  que criam o perfil na mesma transação. `extra` grava CPF/nascimento. */
  async create(
    dto: CreateUserDto,
    db: DbClient = this.prisma.db,
    extra: { cpf?: string; birthDate?: Date } = {},
  ) {
    const cpf = extra.cpf ?? dto.cpf;
    if (!isValidCpf(cpf)) {
      throw new BadRequestException('CPF inválido');
    }
    const passwordHash = await this.passwords.hash(dto.password);

    try {
      return await db.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          passwordHash,
          role: dto.role,
          cpf,
          birthDate: extra.birthDate,
        },
        omit: { passwordHash: true },
      });
    } catch (error) {
      if (isUniqueViolation(error))
        throw new ConflictException(
          'Já existe um usuário com este e-mail ou CPF',
        );
      throw error;
    }
  }

  /** Usado por POST /users: cria o User e o perfil do papel escolhido na
   *  mesma transação, para não deixar usuário "órfão".
   *  Só o SUPER_ADMIN cria administradores. SUPER_ADMIN nunca é criado pela
   *  API (somente por seed/CLI). */
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

  /**
   * Atualiza nome, CPF e nascimento (usado pelos perfis e pela recepção).
   * O próprio usuário só pode DEFINIR o CPF (se ainda não houver); para
   * corrigir um CPF já cadastrado, é preciso a recepção/admin
   * (`allowCpfChange: true`).
   */
  async updatePersonalData(
    userId: string,
    data: PersonalData,
    opts: { allowCpfChange: boolean },
    db: DbClient = this.prisma.db,
  ) {
    if (data.cpf !== undefined && !isValidCpf(data.cpf)) {
      throw new BadRequestException('CPF inválido');
    }
    const current = await db.user.findUnique({
      where: { id: userId },
      select: { cpf: true },
    });
    if (!current) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (
      data.cpf !== undefined &&
      current.cpf &&
      current.cpf !== data.cpf &&
      !opts.allowCpfChange
    ) {
      throw new BadRequestException(
        'O CPF já cadastrado não pode ser alterado por aqui. Procure a recepção.',
      );
    }

    return db.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        cpf: data.cpf,
        birthDate: data.birthDate ? parseBirthDate(data.birthDate) : undefined,
      },
      omit: { passwordHash: true },
    });
  }

  /** O super administrador não aparece para os demais usuários. */
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
      data: {
        ...dto,
        birthDate: dto.birthDate ? parseBirthDate(dto.birthDate) : undefined,
      },
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

  /** Privilégios: ADMIN gerencia os demais papéis, mas não administradores;
   *  o SUPER_ADMIN gerencia todos, porém não pode ser desativado pela API
   *  (evita ficar sem conta raiz). */
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
