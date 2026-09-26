// apps/api/src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Um SERVICE é onde mora a LÓGICA. Ele não sabe nada sobre HTTP
 * (não conhece rota, nem status code) — só sabe conversar com o banco
 * (via PrismaService) e fazer as contas/regras necessárias.
 *
 * `@Injectable()` avisa o Nest: "esta classe pode ser injetada em outras".
 * É isso que permite o Controller simplesmente PEDIR um UsersService no
 * construtor, sem precisar saber como criar um.
 */
@Injectable()
export class UsersService {
  // O Nest cria (ou reaproveita) um PrismaService e um PasswordService
  // sozinho e entrega aqui. Isso se chama "injeção de dependência" (DI).
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async create(dto: CreateUserDto) {
    // Nunca guardamos a senha "pura" no banco. `hash()` a embaralha.
    const passwordHash = await this.passwords.hash(dto.password);

    // `omit` diz ao Prisma: "monte o resultado, mas tire o passwordHash dele".
    return this.prisma.db.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
      omit: { passwordHash: true },
    });
  }

  findAll() {
    return this.prisma.db.user.findMany({
      omit: { passwordHash: true },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.db.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.db.user.update({
      where: { id },
      data: dto,
      omit: { passwordHash: true },
    });
  }

  /** Não apagamos usuário do banco (prontuário e financeiro dependem dele). Só desligamos o acesso. */
  deactivate(id: string) {
    return this.prisma.db.user.update({
      where: { id },
      data: { isActive: false },
      omit: { passwordHash: true },
    });
  }

  /**
   * Uso interno do AuthModule (login). Esta é a ÚNICA função que devolve o
   * passwordHash — e só porque o AuthService precisa comparar a senha.
   * Ela nunca deve virar uma rota HTTP.
   */
  findByEmailWithPassword(email: string) {
    return this.prisma.db.user.findUnique({ where: { email } });
  }
}
