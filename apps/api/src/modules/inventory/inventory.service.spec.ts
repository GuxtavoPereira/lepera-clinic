import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from './inventory.service';

const admin: AuthUser = { sub: 'admin-id', role: 'ADMIN' };
const item = {
  id: 'item-id',
  name: 'Papel A4',
  description: 'Material',
  category: 'GENERAL',
  testEdition: null,
  testMaterial: null,
  stockQuantity: 10,
  minimumStock: 5,
  createdAt: new Date('2026-11-01T12:00:00Z'),
  updatedAt: new Date('2026-11-01T12:00:00Z'),
};

describe('InventoryService', () => {
  const inventoryItem = {
    findUnique: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    fields: { minimumStock: { name: 'minimumStock' } },
  };
  const stockMovement = {
    create: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn(),
  };
  const log = jest.fn();
  const db = { inventoryItem, stockMovement, $transaction: jest.fn() };
  const service = new InventoryService(
    { db } as unknown as PrismaService,
    { log } as unknown as AuditService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    inventoryItem.findUnique.mockResolvedValue(item);
    inventoryItem.create.mockResolvedValue({ ...item, stockQuantity: 0 });
    inventoryItem.updateMany.mockResolvedValue({ count: 1 });
    inventoryItem.count.mockResolvedValue(1);
    inventoryItem.findMany.mockResolvedValue([item]);
    stockMovement.create.mockResolvedValue({ id: 'movement-id' });
    stockMovement.findMany.mockResolvedValue([]);
    stockMovement.count.mockResolvedValue(0);
    log.mockResolvedValue({ id: 'audit-id' });
    db.$transaction.mockImplementation(
      (input: ((tx: typeof db) => Promise<unknown>) | Promise<unknown>[]) =>
        typeof input === 'function' ? input(db) : Promise.all(input),
    );
  });

  it.each(['RECEPTIONIST', 'DOCTOR', 'PATIENT'] as const)(
    'rejects every inventory operation for %s',
    async (role) => {
      const actor: AuthUser = { sub: 'blocked', role };
      await expect(
        service.findAll({ page: 1, pageSize: 20 }, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.summary(actor)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(
        service.create({ name: 'Papel A4', minimumStock: 5 }, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.update('item-id', { name: 'Papel A5' }, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.movements('item-id', { page: 1, pageSize: 20 }, actor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.move(
          'item-id',
          { movementType: 'ENTRY', quantity: 1, justification: 'Reposição' },
          actor,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it('creates an empty item and its audit in one transaction', async () => {
    await service.create({ name: 'Papel A4', minimumStock: 5 }, admin);
    expect(inventoryItem.create).toHaveBeenCalledWith({
      data: {
        name: 'Papel A4',
        description: null,
        category: 'GENERAL',
        testEdition: null,
        testMaterial: null,
        minimumStock: 5,
        stockQuantity: 0,
      },
      select: expect.objectContaining({ stockQuantity: true }) as unknown,
    });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inventory.create', actor: admin }),
      db,
    );
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });

  it('uses a column reference for low stock, including the exact minimum', async () => {
    await service.findAll(
      { page: 2, pageSize: 10, lowStock: true, search: 'papel' },
      admin,
    );
    expect(inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stockQuantity: { lte: inventoryItem.fields.minimumStock },
          OR: [
            { name: { contains: 'papel', mode: 'insensitive' } },
            { description: { contains: 'papel', mode: 'insensitive' } },
            { testEdition: { contains: 'papel', mode: 'insensitive' } },
          ],
        },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('summarizes items without loading all rows', async () => {
    inventoryItem.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1);
    inventoryItem.aggregate.mockResolvedValue({ _sum: { stockQuantity: 15 } });
    await expect(service.summary(admin)).resolves.toEqual({
      totalItems: 4,
      lowStockItems: 2,
      outOfStockItems: 1,
      totalUnits: 15,
    });
    expect(inventoryItem.findMany).not.toHaveBeenCalled();
  });

  it('records a positive entry with an overflow guard and audit', async () => {
    await service.move(
      item.id,
      {
        movementType: 'ENTRY',
        quantity: 8,
        justification: 'Compra de material',
      },
      admin,
    );
    expect(inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: item.id, stockQuantity: { lte: 1_999_999_992 } },
      data: { stockQuantity: { increment: 8 } },
    });
    expect(stockMovement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          itemId: item.id,
          userId: admin.sub,
          movementType: 'ENTRY',
          quantity: 8,
          justification: 'Compra de material',
        },
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'inventory.entry',
        metadata: expect.objectContaining({
          movementId: 'movement-id',
          quantity: 8,
        }) as unknown,
      }),
      db,
    );
  });

  it('refuses an exit without enough stock and writes no movement or audit', async () => {
    inventoryItem.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.move(
        item.id,
        { movementType: 'EXIT', quantity: 11, justification: 'Uso diário' },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(inventoryItem.updateMany).toHaveBeenCalledWith({
      where: { id: item.id, stockQuantity: { gte: 11 } },
      data: { stockQuantity: { decrement: 11 } },
    });
    expect(stockMovement.create).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('uses a conditional decrement so concurrent exits cannot overspend a balance', async () => {
    let balance = 10;
    inventoryItem.updateMany.mockImplementation(
      ({ where }: { where: { stockQuantity: { gte: number } } }) => {
        if (balance < where.stockQuantity.gte)
          return Promise.resolve({ count: 0 });
        balance -= where.stockQuantity.gte;
        return Promise.resolve({ count: 1 });
      },
    );
    const dto = {
      movementType: 'EXIT' as const,
      quantity: 8,
      justification: 'Consumo de material',
    };
    const result = await Promise.allSettled([
      service.move(item.id, dto, admin),
      service.move(item.id, dto, admin),
    ]);
    expect(result.filter((entry) => entry.status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(result.filter((entry) => entry.status === 'rejected')).toHaveLength(
      1,
    );
    expect(balance).toBe(2);
    expect(stockMovement.create).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(1);
  });

  it('maps a serialization conflict to a retryable conflict', async () => {
    db.$transaction.mockRejectedValue({ code: 'P2034' });
    await expect(
      service.move(
        item.id,
        { movementType: 'ENTRY', quantity: 1, justification: 'Reposição' },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([0, -1, 0.5, 1000001, NaN])(
    'rejects invalid movement quantity %s in the service',
    async (quantity) => {
      await expect(
        service.move(
          item.id,
          { movementType: 'EXIT', quantity, justification: 'Consumo' },
          admin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.$transaction).not.toHaveBeenCalled();
    },
  );

  it('does not edit a missing item', async () => {
    inventoryItem.findUnique.mockResolvedValue(null);
    await expect(
      service.update(item.id, { name: 'Material novo' }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(inventoryItem.updateMany).not.toHaveBeenCalled();
  });

  it('allows the super administrator and preserves metadata update audit', async () => {
    await service.update(
      item.id,
      { name: 'Papel A5', minimumStock: 3 },
      { sub: 'root', role: 'SUPER_ADMIN' },
    );
    expect(inventoryItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: item.id, updatedAt: item.updatedAt },
        data: {
          name: 'Papel A5',
          minimumStock: 3,
          category: 'GENERAL',
          testEdition: null,
          testMaterial: null,
        },
      }),
    );
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'inventory.update' }),
      db,
    );
  });

  it('rejects an empty metadata update', async () => {
    await expect(service.update(item.id, {}, admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('requires an edition and physical material when registering a test', async () => {
    const incomplete = {
      category: 'PSYCHOLOGICAL_TEST' as const,
      name: 'Instrumento fictício',
      minimumStock: 1,
    };
    await expect(
      service.create({ ...incomplete, testMaterial: 'KIT' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ ...incomplete, testEdition: '2ª edição' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventoryItem.create).not.toHaveBeenCalled();
    await service.create(
      { ...incomplete, testMaterial: 'KIT', testEdition: '2ª edição' },
      admin,
    );
    expect(inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'PSYCHOLOGICAL_TEST',
          testMaterial: 'KIT',
          testEdition: '2ª edição',
          stockQuantity: 0,
        }) as unknown,
      }),
    );
  });

  it('preserves test specifications on a partial update and clears them when reclassified', async () => {
    inventoryItem.findUnique.mockResolvedValue({
      ...item,
      category: 'PSYCHOLOGICAL_TEST',
      testEdition: '2ª edição',
      testMaterial: 'MANUAL',
    });
    await service.update(item.id, { minimumStock: 2 }, admin);
    expect(inventoryItem.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'PSYCHOLOGICAL_TEST',
          testEdition: '2ª edição',
          testMaterial: 'MANUAL',
        }) as unknown,
      }),
    );
    await service.update(item.id, { category: 'GENERAL' }, admin);
    expect(inventoryItem.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          category: 'GENERAL',
          testEdition: null,
          testMaterial: null,
        }) as unknown,
      }),
    );
  });

  it('does not store test metadata on general items or incomplete conversions', async () => {
    await expect(
      service.update(item.id, { testEdition: '1ª edição' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update(item.id, { category: 'PSYCHOLOGICAL_TEST' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(inventoryItem.updateMany).not.toHaveBeenCalled();
  });

  it('combines the category filter with the low-stock filter', async () => {
    await service.findAll(
      { page: 1, pageSize: 15, lowStock: true, category: 'PSYCHOLOGICAL_TEST' },
      admin,
    );
    expect(inventoryItem.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          category: 'PSYCHOLOGICAL_TEST',
          stockQuantity: { lte: inventoryItem.fields.minimumStock },
        },
      }),
    );
  });

  it('limits movement user projection to the operator name', async () => {
    await service.movements(item.id, { page: 1, pageSize: 10 }, admin);
    expect(stockMovement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          user: { select: { name: true } },
        }) as unknown,
        take: 10,
        skip: 0,
      }),
    );
  });
});
