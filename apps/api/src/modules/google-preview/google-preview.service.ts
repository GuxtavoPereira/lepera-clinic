import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentCalendarService } from '../appointments/appointment-calendar.service';
import type { CalendarQueryDto } from '../appointments/dto/calendar-query.dto';

const ISSUER = 'lepera-clinic';
const CHALLENGE_AUDIENCE = 'lepera-google-challenge';
const PREVIEW_AUDIENCE = 'lepera-google-preview';
export type PreviewIdentity = { sub: string; name: string; email: string };

@Injectable()
export class GoogleIdentityVerifier {
  private readonly client = new OAuth2Client();
  async verify(
    credential: string,
    audience: string,
  ): Promise<TokenPayload | undefined> {
    const ticket = await this.client.verifyIdToken({
      idToken: credential,
      audience,
    });
    return ticket.getPayload();
  }
}

@Injectable()
export class GooglePreviewService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly verifier: GoogleIdentityVerifier,
    private readonly prisma: PrismaService,
    private readonly calendar: AppointmentCalendarService,
  ) {}

  configuration() {
    const clientId =
      this.config.get<string>('GOOGLE_CLIENT_ID')?.trim() || null;
    return { enabled: !!clientId, clientId };
  }

  private enabledClient() {
    const clientId = this.configuration().clientId;
    if (!clientId)
      throw new ServiceUnavailableException(
        'A consulta com Google ainda não está disponível.',
      );
    return clientId;
  }

  private checkOrigin(origin: string | undefined) {
    const allowed = new URL(this.config.getOrThrow<string>('WEB_URL')).origin;
    if (origin !== allowed)
      throw new ForbiddenException('Origem não autorizada');
  }

  async challenge(origin: string | undefined) {
    this.enabledClient();
    this.checkOrigin(origin);
    const nonce = randomBytes(32).toString('base64url');
    const challenge = await this.jwt.signAsync(
      { purpose: 'google_challenge', nonce },
      {
        expiresIn: '5m',
        audience: CHALLENGE_AUDIENCE,
        issuer: ISSUER,
        algorithm: 'HS256',
      },
    );
    return { nonce, challenge, expiresIn: 300 };
  }

  async createSession(
    credential: string,
    challenge: string,
    origin: string | undefined,
  ) {
    const audience = this.enabledClient();
    this.checkOrigin(origin);
    let identity: TokenPayload;
    try {
      const expected = await this.jwt.verifyAsync<{
        purpose: string;
        nonce: string;
      }>(challenge, {
        algorithms: ['HS256'],
        audience: CHALLENGE_AUDIENCE,
        issuer: ISSUER,
      });
      if (expected.purpose !== 'google_challenge' || !expected.nonce)
        throw new Error('challenge');
      const verified = await this.verifier.verify(credential, audience);
      if (
        !verified?.sub ||
        verified.sub.length > 255 ||
        verified.email_verified !== true ||
        !verified.email ||
        verified.nonce !== expected.nonce
      )
        throw new Error('identity');
      identity = verified;
    } catch {
      throw new UnauthorizedException(
        'Não foi possível validar o Google. Atualize a página e tente novamente.',
      );
    }
    const profile = {
      name: (identity.name || 'Visitante').slice(0, 150),
      email: identity.email!,
    };
    const accessToken = await this.jwt.signAsync(
      {
        sub: `google:${identity.sub}`,
        purpose: 'google_preview',
        scope: 'calendar:read',
        ...profile,
      },
      {
        expiresIn: '30m',
        audience: PREVIEW_AUDIENCE,
        issuer: ISSUER,
        algorithm: 'HS256',
      },
    );
    return {
      accessToken,
      profile,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    };
  }

  async verifySession(token: string): Promise<PreviewIdentity> {
    this.enabledClient();
    try {
      const p = await this.jwt.verifyAsync<
        PreviewIdentity & { purpose: string; scope: string }
      >(token, {
        algorithms: ['HS256'],
        audience: PREVIEW_AUDIENCE,
        issuer: ISSUER,
      });
      if (
        p.purpose !== 'google_preview' ||
        p.scope !== 'calendar:read' ||
        typeof p.sub !== 'string' ||
        !p.sub.startsWith('google:') ||
        typeof p.name !== 'string' ||
        typeof p.email !== 'string'
      )
        throw new Error('scope');
      return { sub: p.sub, name: p.name, email: p.email };
    } catch {
      throw new UnauthorizedException(
        'Seu acesso de consulta expirou. Entre com Google novamente.',
      );
    }
  }

  async doctors() {
    const rows = await this.prisma.db.doctor.findMany({
      where: { user: { isActive: true } },
      select: {
        id: true,
        specialty: true,
        clinicalApproach: true,
        user: { select: { name: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
    return {
      items: rows.map((d) => ({
        id: d.id,
        name: d.user.name,
        specialty: d.specialty,
        clinicalApproach: d.clinicalApproach,
      })),
    };
  }

  slots(query: CalendarQueryDto) {
    return this.calendar.previewAvailableSlots(query);
  }
}
