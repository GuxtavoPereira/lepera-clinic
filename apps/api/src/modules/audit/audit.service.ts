import { Injectable } from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { DbClient } from '../../prisma/prisma.types';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';

export type AuditEntry = {
  actor?: AuthUser | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonObject;
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(entry: AuditEntry, db: DbClient = this.prisma.db) {
    return db.auditLog.create({
      data: {
        actorId: entry.actor?.sub ?? null,
        actorRole: entry.actor?.role ?? null,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ?? null,
        metadata: entry.metadata,
        ip: entry.ip,
        userAgent: entry.userAgent?.slice(0, 300),
      },
    });
  }

  async findAll(query: ListAuditLogsDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.db.auditLog.count({ where }),
      this.prisma.db.auditLog.findMany({
        where,
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }
}
