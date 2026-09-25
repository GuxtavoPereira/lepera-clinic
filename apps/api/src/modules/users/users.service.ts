// users.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateUserBaseInput,
  ListUsersQuery,
  Paginated,
  Role,
  UpdateUserInput,
  UserResponse,
} from '@lepera/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import type { DbClient } from '../../prisma/prisma.types';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { PasswordService } from './password.service';
import { toUserResponse, USER_OMIT } from './users.mapper';

export type CreateUserData = CreateUserBaseInput & { role: Role };

const toDate = (value: string | null | undefined) =>
  value == null ? value : new Date(value);

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  /**
   * Cria o usuário-base. NÃO tem rota: é chamado pelos módulos de médico, paciente e
   * recepcionista, que passam `db` (o `tx` da transação) para gravar tudo junto.
   */
  async create(
    data: CreateUserData,
    db: DbClient = this.prisma.db,
  ): Promise<UserResponse> {
    await this.assertUnique(db, { email: data.email, cpf: data.cpf });

    try {
      const user = await db.user.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash: await this.passwords.hash(data.password),
          cpf: data.cpf,
          birthDate: toDate(data.birthDate),
          photoUrl: data.photoUrl,
          role: data.role,
        },
        omit: USER_OMIT,
      });
      return toUserResponse(user);
    } catch (error) {
      // Rede de segurança: duas requisições simultâneas passam pela checagem acima.
      if (isUniqueViolation(error))
        throw new ConflictException('E-mail ou CPF já cadastrado');
      throw error;
    }
  }

  async findAll(query: ListUsersQuery): Promise<Paginated<UserResponse>> {
    const { page, pageSize, role, isActive, search } = query;

    // No Prisma, `undefined` num filtro significa "ignore". No MySQL o `contains`
    // já ignora maiúsculas (não existe o `mode: 'insensitive'` aqui).
    const where = {
      role,
      isActive,
      OR: search
        ? [
            { name: { contains: search } },
            { email: { contains: search } },
            { cpf: { contains: search } },
          ]
        : undefined,
    };

    const [total, users] = await Promise.all([
      this.prisma.db.user.count({ where }),
      this.prisma.db.user.findMany({
        where,
        omit: USER_OMIT,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: users.map((user) => toUserResponse(user)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(
    id: string,
    db: DbClient = this.prisma.db,
  ): Promise<UserResponse> {
    const user = await db.user.findUnique({ where: { id }, omit: USER_OMIT });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return toUserResponse(user);
  }

  /** `role` não é editável aqui: trocar o papel sem trocar as tabelas de perfil quebraria os dados. */
  async update(id: string, data: UpdateUserInput): Promise<UserResponse> {
    await this.findById(id); // 404 se não existir
    await this.assertUnique(
      this.prisma.db,
      {
        email: data.email,
        cpf: data.cpf,
      },
      id,
    );

    const user = await this.prisma.db.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        cpf: data.cpf,
        birthDate: toDate(data.birthDate),
        photoUrl: data.photoUrl,
      },
      omit: USER_OMIT,
    });
    return toUserResponse(user);
  }

  /** Desativar em vez de apagar: prontuários e financeiro precisam manter o histórico. */
  async setActive(id: string, isActive: boolean): Promise<UserResponse> {
    await this.findById(id);
    const user = await this.prisma.db.user.update({
      where: { id },
      data: { isActive },
      omit: USER_OMIT,
    });
    return toUserResponse(user);
  }

  /** Uso INTERNO do futuro AuthModule. Devolve o hash: nunca retorne isto numa rota. */
  findWithPasswordByEmail(email: string) {
    return this.prisma.db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  private async assertUnique(
    db: DbClient,
    fields: { email?: string; cpf?: string | null },
    ignoreId?: string,
  ) {
    const or = [
      ...(fields.email ? [{ email: fields.email }] : []),
      ...(fields.cpf ? [{ cpf: fields.cpf }] : []),
    ];
    if (or.length === 0) return;

    const existing = await db.user.findFirst({
      where: { OR: or, NOT: ignoreId ? { id: ignoreId } : undefined },
      select: { email: true },
    });
    if (!existing) return;

    throw new ConflictException(
      fields.email && existing.email === fields.email
        ? 'E-mail já cadastrado'
        : 'CPF já cadastrado',
    );
  }
}
