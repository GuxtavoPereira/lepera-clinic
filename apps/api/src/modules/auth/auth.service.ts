// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PasswordService } from '../users/password.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    // 1. Existe alguém com esse e-mail?
    const user = await this.users.findByEmailWithPassword(email);
    if (!user) {
      // Repare: a mensagem é a MESMA para "não existe" e para "senha errada".
      // Isso é de propósito — não damos pista pra quem está tentando adivinhar.
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // 2. A senha digitada bate com o hash guardado?
    const passwordOk = await this.passwords.verify(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    // 3. O usuário está ativo?
    if (!user.isActive) {
      throw new UnauthorizedException('Usuário desativado');
    }

    // 4. Tudo certo → emite um token JWT.
    // O "payload" é o que vai DENTRO do token (não é secreto, só assinado:
    // dá pra ler, mas não dá pra forjar sem a chave do servidor).
    const accessToken = await this.jwt.signAsync({
      sub: user.id, // "sub" = subject = de quem é este token
      role: user.role,
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
