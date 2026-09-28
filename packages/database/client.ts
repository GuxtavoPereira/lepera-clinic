import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client";

export function createPrismaClient(databaseUrl: string) {
  return new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });
}
export type PrismaClientInstance = ReturnType<typeof createPrismaClient>;