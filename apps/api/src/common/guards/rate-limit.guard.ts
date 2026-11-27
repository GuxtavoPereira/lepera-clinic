import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

export type RateLimitOptions = {
  /** Nome do "balde" (ex.: "login"). */
  name: string;
  /** Máximo de requisições dentro da janela. */
  limit: number;
  windowMs: number;
  /** Também limita por e-mail enviado no corpo (freia força bruta numa conta
   *  mesmo vinda de vários IPs). */
  byEmail?: boolean;
};

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

type Bucket = { count: number; resetAt: number };

function hashKeyPart(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

/**
 * SEC-02: Limitador distribuído persistido no PostgreSQL (compartilhado entre
 * instâncias serverless e preservado após reinício), com fallback em memória
 * apenas quando instanciado sem PrismaService em testes unitários.
 * Atrás de proxy (ex.: Vercel), TRUST_PROXY garante `req.ip` real do cliente.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, Bucket>();
  private static hits = 0;

  /** Para testes. */
  static reset() {
    RateLimitGuard.buckets.clear();
    RateLimitGuard.hits = 0;
  }

  constructor(
    private readonly reflector: Reflector,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      ctx.getHandler(),
    );
    if (!options) return true;

    const http = ctx.switchToHttp();
    const req = http.getRequest<{ ip?: string; body?: { email?: unknown } }>();
    const res = http.getResponse<Response | undefined>();

    const keys = [`${options.name}:ip:${hashKeyPart(req.ip ?? 'unknown')}`];
    if (options.byEmail && typeof req.body?.email === 'string') {
      const normalized = req.body.email.trim().toLowerCase();
      if (normalized) {
        keys.push(`${options.name}:email:${hashKeyPart(normalized)}`);
      }
    }

    const now = Date.now();
    for (const key of keys) {
      const bucket = this.prisma
        ? await this.incrementInDb(key, options.windowMs, now)
        : this.incrementInMemory(key, options.windowMs, now);

      if (bucket.count > options.limit) {
        const seconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
        if (res && typeof res.setHeader === 'function') {
          res.setHeader('Retry-After', String(seconds));
        }
        const wait =
          seconds >= 120
            ? `${Math.ceil(seconds / 60)} minutos`
            : `${seconds} segundos`;
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Muitas tentativas. Tente novamente em ${wait}.`,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }

  private async incrementInDb(
    key: string,
    windowMs: number,
    now: number,
  ): Promise<Bucket> {
    const nowDate = new Date(now);
    const nextReset = new Date(now + windowMs);

    const rows = await this.prisma!.db.$queryRaw<
      Array<{ count: number; resetAt: Date }>
    >`
      INSERT INTO "rate_limit_buckets" ("key", "count", "resetAt", "updatedAt")
      VALUES (${key}, 1, ${nextReset}, ${nowDate})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "rate_limit_buckets"."resetAt" <= ${nowDate} THEN 1
          ELSE "rate_limit_buckets"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "rate_limit_buckets"."resetAt" <= ${nowDate} THEN ${nextReset}
          ELSE "rate_limit_buckets"."resetAt"
        END,
        "updatedAt" = ${nowDate}
      RETURNING "count", "resetAt"
    `;

    RateLimitGuard.hits += 1;
    if (RateLimitGuard.hits % 100 === 0) {
      void this.prisma!.db.rateLimitBucket.deleteMany({
        where: { resetAt: { lte: nowDate } },
      }).catch(() => {});
    }

    const row = rows[0];
    return {
      count: Number(row?.count ?? 1),
      resetAt: row?.resetAt
        ? new Date(row.resetAt).getTime()
        : nextReset.getTime(),
    };
  }

  private incrementInMemory(
    key: string,
    windowMs: number,
    now: number,
  ): Bucket {
    this.prune(now);
    const existing = RateLimitGuard.buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      const fresh: Bucket = { count: 1, resetAt: now + windowMs };
      RateLimitGuard.buckets.set(key, fresh);
      return fresh;
    }
    existing.count += 1;
    return existing;
  }

  private prune(now: number) {
    if (RateLimitGuard.buckets.size < 5000) return;
    for (const [key, bucket] of RateLimitGuard.buckets) {
      if (bucket.resetAt <= now) RateLimitGuard.buckets.delete(key);
    }
  }
}
