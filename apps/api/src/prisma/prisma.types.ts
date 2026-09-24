// apps/api/src/prisma/prisma.types.ts
import type { PrismaClientInstance } from '@lepera/db';

/** Aceita o client normal OU o `tx` de uma transação: assim um service participa da transação de outro. */
export type DbClient = Omit
  PrismaClientInstance,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;