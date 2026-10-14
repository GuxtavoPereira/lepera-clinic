import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET precisa de 16+ caracteres'),
  WEB_URL: z.string().url().default('http://localhost:3000'),
  ENCRYPTION_KEY: z
    .string()
    .regex(
      /^[0-9a-fA-F]{64}$/,
      'ENCRYPTION_KEY precisa ter 64 caracteres hexadecimais (32 bytes)',
    ),
});

export type Env = z.infer<typeof envSchema>;
