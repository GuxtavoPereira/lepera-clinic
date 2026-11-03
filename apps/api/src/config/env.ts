import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa de 16+ caracteres'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  GOOGLE_CLIENT_ID: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/)
    .optional()
    .or(z.literal('')),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(465),
  SMTP_USER: z.string().email().optional().or(z.literal('')),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional().or(z.literal('')),
  // Chave AES-256 dos dados clínicos (RNF01): 32 bytes em hexadecimal.
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'ENCRYPTION_KEY precisa ter 64 caracteres hexadecimais (32 bytes)',
    ),
  // Quantos proxies existem na frente da API (Vercel/nginx = 1). Com 0 o
  // `req.ip` é o do proxy; com o valor certo é o IP real do cliente
  // (rate limit e auditoria dependem disso).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

export type Env = z.infer<typeof envSchema>;
