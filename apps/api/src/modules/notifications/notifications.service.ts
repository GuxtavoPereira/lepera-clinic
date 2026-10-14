import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

/** Notificações internas do próprio usuário. */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  findMine(user: AuthUser) {
    return this.prisma.db.notification.findMany({
      where: { userId: user.sub },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.db.notification.count({
      where: { userId: user.sub, isRead: false },
    });
    return { count };
  }

  async markRead(id: string, user: AuthUser) {
    // userId no WHERE: notificação de outra pessoa responde 404.
    const updated = await this.prisma.db.notification.updateMany({
      where: { id, userId: user.sub },
      data: { isRead: true },
    });
    if (updated.count === 0) {
      throw new NotFoundException('Notificação não encontrada');
    }
    return { ok: true };
  }

  async markAllRead(user: AuthUser) {
    const updated = await this.prisma.db.notification.updateMany({
      where: { userId: user.sub, isRead: false },
      data: { isRead: true },
    });
    return { updated: updated.count };
  }
}
