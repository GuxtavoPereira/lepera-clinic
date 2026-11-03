import { isTransactionConflict } from '../../prisma/prisma-errors';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import nodemailer, { type Transporter } from 'nodemailer';
import { Prisma } from '@lepera/db';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from '../users/password.service';

export const RECOVERY_MESSAGE =
  'Se existir uma conta ativa com este e-mail, você receberá as instruções para redefinir a senha.';
const INVALID_TOKEN =
  'Este link é inválido ou expirou. Solicite uma nova recuperação de senha.';
const digest = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class RecoveryMailer {
  private transport?: Transporter;
  constructor(private readonly config: ConfigService) {}
  configured() {
    return !!(
      this.config.get<string>('SMTP_HOST') &&
      this.config.get<string>('SMTP_USER') &&
      this.config.get<string>('SMTP_PASSWORD') &&
      this.config.get<string>('SMTP_FROM')
    );
  }
  async send(to: string, resetLink: string) {
    if (!this.configured())
      throw new ServiceUnavailableException(
        'O envio de e-mail ainda não foi ativado. Entre em contato com a recepção.',
      );
    const port = this.config.get<number>('SMTP_PORT') ?? 465;
    this.transport ??= nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port,
      secure: port === 465,
      requireTLS: port !== 465,
      auth: {
        user: this.config.getOrThrow<string>('SMTP_USER'),
        pass: this.config.getOrThrow<string>('SMTP_PASSWORD'),
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    await this.transport.sendMail({
      from: {
        name: 'Leperapia Clinic',
        address: this.config.getOrThrow<string>('SMTP_FROM'),
      },
      to,
      subject: 'Redefinição de senha — Leperapia Clinic',
      text: `Recebemos uma solicitação para redefinir a senha da sua conta na Leperapia Clinic.\n\nAbra este link para escolher uma nova senha:\n${resetLink}\n\nO link expira em 30 minutos e pode ser usado uma vez. Se não fez esta solicitação, ignore a mensagem. Sua senha permanece a mesma.`,
    });
  }
}

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
    private readonly mailer: RecoveryMailer,
  ) {}

  async forgot(email: string) {
    if (!this.mailer.configured())
      throw new ServiceUnavailableException(
        'O envio de e-mail ainda não foi ativado. Entre em contato com a recepção.',
      );
    const user = await this.prisma.db.user.findUnique({
      where: { email },
      select: { id: true, isActive: true },
    });
    if (user?.isActive) {
      const token = randomBytes(32).toString('base64url');
      const created = await this.prisma.db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + 30 * 60_000),
        },
        select: { id: true },
      });
      const link = new URL(
        '/auth/reset-password',
        this.config.getOrThrow<string>('WEB_URL'),
      );
      link.searchParams.set('token', token);
      try {
        await this.mailer.send(email, link.toString());
      } catch {
        // Never leak SMTP errors, addresses, or a raw recovery token to the client/logs.
        await this.prisma.db.passwordResetToken.update({
          where: { id: created.id },
          data: { usedAt: new Date() },
        });
      }
    }
    return { message: RECOVERY_MESSAGE };
  }

  async reset(token: string, password: string) {
    const tokenHash = digest(token);
    const record = await this.prisma.db.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
        user: { select: { isActive: true } },
      },
    });
    if (
      !record ||
      record.usedAt ||
      record.expiresAt <= new Date() ||
      !record.user.isActive
    )
      throw new BadRequestException(INVALID_TOKEN);
    const passwordHash = await this.passwords.hash(password);
    try {
      await this.prisma.db.$transaction(
        async (tx) => {
          const claimed = await tx.passwordResetToken.updateMany({
            where: {
              id: record.id,
              usedAt: null,
              expiresAt: { gt: new Date() },
            },
            data: { usedAt: new Date() },
          });
          if (claimed.count !== 1) throw new BadRequestException(INVALID_TOKEN);
          const updated = await tx.user.updateMany({
            where: { id: record.userId, isActive: true },
            data: { passwordHash, sessionVersion: { increment: 1 } },
          });
          if (updated.count !== 1) throw new BadRequestException(INVALID_TOKEN);
          await tx.passwordResetToken.updateMany({
            where: { userId: record.userId, usedAt: null },
            data: { usedAt: new Date() },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (isTransactionConflict(error))
        throw new BadRequestException(INVALID_TOKEN);
      throw error;
    }
    return { message: 'Senha redefinida. Entre com sua nova senha.' };
  }
}
