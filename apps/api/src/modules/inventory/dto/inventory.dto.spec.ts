import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import {
  CreateInventoryItemDto,
  CreateStockMovementDto,
  ListInventoryDto,
  UpdateInventoryItemDto,
} from './inventory.dto';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
});

describe('Inventory DTO validation', () => {
  it('trims item data and keeps a default reorder point', async () => {
    await expect(
      pipe.transform(
        { name: '  Papel A4  ' },
        { type: 'body', metatype: CreateInventoryItemDto },
      ),
    ).resolves.toMatchObject({ name: 'Papel A4', minimumStock: 5 });
  });

  it.each([null, -1, 0.5, 1000001, '5'])(
    'rejects invalid minimum stock %s',
    async (minimumStock) => {
      await expect(
        pipe.transform(
          { name: 'Papel A4', minimumStock },
          { type: 'body', metatype: CreateInventoryItemDto },
        ),
      ).rejects.toThrow();
    },
  );

  it('rejects arbitrary stock editing in both create and update', async () => {
    await expect(
      pipe.transform(
        { name: 'Papel A4', stockQuantity: 10 },
        { type: 'body', metatype: CreateInventoryItemDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { stockQuantity: 10 },
        { type: 'body', metatype: UpdateInventoryItemDto },
      ),
    ).rejects.toThrow();
  });

  it.each([
    {},
    { movementType: 'EXIT', quantity: 1 },
    { movementType: 'EXIT', quantity: 1, justification: '  ' },
    { movementType: 'EXIT', quantity: -1, justification: 'Consumo' },
    { movementType: 'OTHER', quantity: 1, justification: 'Consumo' },
  ])('rejects incomplete or invalid movements %j', async (body) => {
    await expect(
      pipe.transform(body, { type: 'body', metatype: CreateStockMovementDto }),
    ).rejects.toThrow();
  });

  it('transforms a boolean filter without interpreting false as true', async () => {
    await expect(
      pipe.transform(
        { lowStock: 'false', page: '2' },
        { type: 'query', metatype: ListInventoryDto },
      ),
    ).resolves.toMatchObject({ lowStock: false, page: 2, pageSize: 20 });
    await expect(
      pipe.transform(
        { lowStock: 'true' },
        { type: 'query', metatype: ListInventoryDto },
      ),
    ).resolves.toMatchObject({ lowStock: true });
    await expect(
      pipe.transform(
        { lowStock: 'yes' },
        { type: 'query', metatype: ListInventoryDto },
      ),
    ).rejects.toThrow();
  });
});
