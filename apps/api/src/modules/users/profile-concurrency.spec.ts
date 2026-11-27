import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { UsersService } from './users.service';

describe('UsersService — ACC-06 Concorrência otimista e SEC-01 Revogação', () => {
  it('rejeita edição de perfil com expectedUpdatedAt defasado (409 Conflict)', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      db: {
        user: {
          findUnique: jest
            .fn()
            .mockResolvedValue({ cpf: '52998224725', socialName: null }),
          updateMany,
        },
      },
    } as unknown as PrismaService;
    const service = new UsersService(prisma, {} as PasswordService);

    await expect(
      service.updatePersonalData(
        'user-1',
        {
          socialName: 'Alex',
          useSocialName: true,
          expectedUpdatedAt: '2026-11-27T10:00:00.000Z',
        },
        { allowCpfChange: false },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'user-1',
          updatedAt: new Date('2026-11-27T10:00:00.000Z'),
        },
      }),
    );
  });

  it('revokeSessions incrementa sessionVersion para invalidar tokens antigos', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      db: { user: { updateMany } },
    } as unknown as PrismaService;
    const service = new UsersService(prisma, {} as PasswordService);

    await service.revokeSessions('user-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'user-1', isActive: true },
      data: { sessionVersion: { increment: 1 } },
    });
  });
});
