// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient, type PrismaClientInstance } from '@lepera/db';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly db: PrismaClientInstance;

  constructor(config: ConfigService) {
    this.db = createPrismaClient(config.getOrThrow<string>('DATABASE_URL'));
  }

  async onModuleDestroy() {
    await this.db.$disconnect();
  }
}
