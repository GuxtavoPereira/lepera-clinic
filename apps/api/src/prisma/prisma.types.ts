import type { PrismaClientInstance } from '@lepera/db';

export type DbClient = Omit<
  PrismaClientInstance,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;
