import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

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

/**
 * Limitador simples em MEMÓRIA, sem dependências. Vale para uma instância da
 * API; com várias instâncias/serverless cada uma conta separado — para isso,
 * troque por @nestjs/throttler com Redis.
 * Atrás de proxy, defina TRUST_PROXY para `req.ip` ser o IP do cliente.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private static readonly buckets = new Map<string, Bucket>();

  /** Para testes. */
  static reset() {
    RateLimitGuard.buckets.clear();
  }

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const options = this.reflector.get<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      ctx.getHandler(),
    );
    if (!options) return true;

    const req = ctx
      .switchToHttp()
      .getRequest<{ ip?: string; body?: { email?: unknown } }>();

    const keys = [`${options.name}:ip:${req.ip ?? 'unknown'}`];
    if (options.byEmail && typeof req.body?.email === 'string') {
      keys.push(`${options.name}:email:${req.body.email.trim().toLowerCase()}`);
    }

    const now = Date.now();
    this.prune(now);

    for (const key of keys) {
      const bucket = RateLimitGuard.buckets.get(key);

      if (!bucket || bucket.resetAt <= now) {
        RateLimitGuard.buckets.set(key, {
          count: 1,
          resetAt: now + options.windowMs,
        });
        continue;
      }

      bucket.count += 1;
      if (bucket.count > options.limit) {
        const seconds = Math.ceil((bucket.resetAt - now) / 1000);
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

  private prune(now: number) {
    if (RateLimitGuard.buckets.size < 5000) return;
    for (const [key, bucket] of RateLimitGuard.buckets) {
      if (bucket.resetAt <= now) RateLimitGuard.buckets.delete(key);
    }
  }
}
