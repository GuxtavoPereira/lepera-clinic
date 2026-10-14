import type { DbClient } from '../../prisma/prisma.types';
import { notifyWaitlistOnFreedSlot } from './waitlist-notify';

describe('notifyWaitlistOnFreedSlot (RF11)', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');
  // 15/10/2026 13:00 UTC = quinta 10:00 em Brasília → manhã
  const morningSlot = {
    doctorId: 'doctor-1',
    startDatetime: new Date('2026-10-15T13:00:00.000Z'),
  };

  let findMany: jest.Mock;
  let createMany: jest.Mock;
  let updateMany: jest.Mock;
  let db: DbClient;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([
      { id: 'w1', patient: { userId: 'user-1' } },
      { id: 'w2', patient: { userId: 'user-2' } },
    ]);
    createMany = jest.fn().mockResolvedValue({});
    updateMany = jest.fn().mockResolvedValue({});
    db = {
      waitlist: { findMany, updateMany },
      notification: { createMany },
      doctor: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ user: { name: 'Dr. Roberto Silva' } }),
      },
    } as unknown as DbClient;
  });

  it('avisa os primeiros da fila e marca como "notified"', async () => {
    await expect(notifyWaitlistOnFreedSlot(db, morningSlot, now)).resolves.toBe(
      2,
    );

    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'user-1',
          type: 'vaga_liberada',
          message: expect.stringContaining('Dr. Roberto Silva') as unknown,
        }) as unknown,
        expect.objectContaining({ userId: 'user-2' }) as unknown,
      ],
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['w1', 'w2'] } },
      data: { status: 'notified' },
    });
  });

  it('filtra por profissional (ou qualquer um), turno e só quem está aguardando', async () => {
    await notifyWaitlistOnFreedSlot(db, morningSlot, now);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'waiting',
          AND: [
            {
              OR: [
                { preferredDoctorId: 'doctor-1' },
                { preferredDoctorId: null },
              ],
            },
            {
              OR: [
                { preferredShift: null },
                { preferredShift: 'INDIFFERENT' },
                { preferredShift: 'MORNING' },
              ],
            },
          ],
        },
        orderBy: [{ priority: 'asc' }, { enteredAt: 'asc' }],
        take: 3,
      }),
    );
  });

  it('vaga à tarde procura o turno da tarde', async () => {
    await notifyWaitlistOnFreedSlot(
      db,
      {
        doctorId: 'doctor-1',
        startDatetime: new Date('2026-10-15T18:00:00.000Z'),
      },
      now,
    );

    const [{ where }] = findMany.mock.calls[0] as [
      { where: { AND: { OR: { preferredShift?: string }[] }[] } },
    ];
    expect(where.AND[1].OR).toContainEqual({ preferredShift: 'AFTERNOON' });
  });

  it('não faz nada para vaga no passado nem sem ninguém na fila', async () => {
    await expect(
      notifyWaitlistOnFreedSlot(
        db,
        {
          doctorId: 'doctor-1',
          startDatetime: new Date('2026-10-01T13:00:00.000Z'),
        },
        now,
      ),
    ).resolves.toBe(0);
    expect(findMany).not.toHaveBeenCalled();

    findMany.mockResolvedValue([]);
    await expect(notifyWaitlistOnFreedSlot(db, morningSlot, now)).resolves.toBe(
      0,
    );
    expect(createMany).not.toHaveBeenCalled();
  });
});
