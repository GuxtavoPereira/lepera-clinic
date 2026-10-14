import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const user = { sub: 'user-1', role: 'PATIENT' as const };
  let updateMany: jest.Mock;
  let count: jest.Mock;
  let service: NotificationsService;

  beforeEach(() => {
    updateMany = jest.fn().mockResolvedValue({ count: 1 });
    count = jest.fn().mockResolvedValue(3);
    service = new NotificationsService({
      db: { notification: { updateMany, count, findMany: jest.fn() } },
    } as unknown as PrismaService);
  });

  it('conta só as não lidas do próprio usuário', async () => {
    await expect(service.unreadCount(user)).resolves.toEqual({ count: 3 });
    expect(count).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
    });
  });

  it('marca como lida só se for do próprio usuário (senão 404)', async () => {
    await service.markRead('n1', user);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'user-1' },
      data: { isRead: true },
    });

    updateMany.mockResolvedValue({ count: 0 });
    await expect(service.markRead('n2', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marcar todas devolve quantas mudaram', async () => {
    updateMany.mockResolvedValue({ count: 4 });
    await expect(service.markAllRead(user)).resolves.toEqual({ updated: 4 });
  });
});
