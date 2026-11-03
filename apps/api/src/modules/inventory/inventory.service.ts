import { isTransactionConflict } from '../../prisma/prisma-errors';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { DbClient } from '../../prisma/prisma.types';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import {
  CreateInventoryItemDto,
  CreateStockMovementDto,
  InventoryPageDto,
  ListInventoryDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';

const MAX_STOCK = 2_000_000_000;
const itemSelect = {
  id: true,
  name: true,
  description: true,
  stockQuantity: true,
  minimumStock: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InventoryItemSelect;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: ListInventoryDto, actor: AuthUser) {
    this.requireAdmin(actor);
    const where = this.where(query);
    const [total, items] = await this.prisma.db.$transaction([
      this.prisma.db.inventoryItem.count({ where }),
      this.prisma.db.inventoryItem.findMany({
        where,
        select: itemSelect,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return this.page(items, total, query);
  }

  async summary(actor: AuthUser) {
    this.requireAdmin(actor);
    const lowStock = this.where({ page: 1, pageSize: 20, lowStock: true });
    const [totalItems, lowStockItems, outOfStockItems, sum] =
      await this.prisma.db.$transaction([
        this.prisma.db.inventoryItem.count(),
        this.prisma.db.inventoryItem.count({ where: lowStock }),
        this.prisma.db.inventoryItem.count({ where: { stockQuantity: 0 } }),
        this.prisma.db.inventoryItem.aggregate({
          _sum: { stockQuantity: true },
        }),
      ]);
    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      totalUnits: sum._sum.stockQuantity ?? 0,
    };
  }

  async create(
    dto: CreateInventoryItemDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    this.requireAdmin(actor);
    return this.mutate(async (db) => {
      const item = await db.inventoryItem.create({
        data: {
          name: dto.name,
          description: dto.description || null,
          minimumStock: dto.minimumStock,
          stockQuantity: 0,
        },
        select: itemSelect,
      });
      await this.audit.log(
        {
          actor,
          action: 'inventory.create',
          resource: 'InventoryItem',
          resourceId: item.id,
          metadata: { minimumStock: item.minimumStock },
          ...ctx,
        },
        db,
      );
      return item;
    });
  }

  async update(
    id: string,
    dto: UpdateInventoryItemDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    this.requireAdmin(actor);
    const fields = Object.entries(dto)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key);
    if (!fields.length) {
      throw new BadRequestException('Informe os dados que deseja alterar');
    }
    return this.mutate(async (db) => {
      const previous = await this.requireItem(db, id);
      const changed = await db.inventoryItem.updateMany({
        where: { id, updatedAt: previous.updatedAt },
        data: {
          name: dto.name,
          description:
            dto.description === undefined ? undefined : dto.description || null,
          minimumStock: dto.minimumStock,
        },
      });
      if (changed.count !== 1) throw this.changedError();
      await this.audit.log(
        {
          actor,
          action: 'inventory.update',
          resource: 'InventoryItem',
          resourceId: id,
          metadata: {
            fields,
            previousMinimumStock: previous.minimumStock,
            minimumStock: dto.minimumStock ?? previous.minimumStock,
          },
          ...ctx,
        },
        db,
      );
      return this.requireItem(db, id);
    });
  }

  async movements(id: string, query: InventoryPageDto, actor: AuthUser) {
    this.requireAdmin(actor);
    const item = await this.requireItem(this.prisma.db, id);
    const [total, items] = await this.prisma.db.$transaction([
      this.prisma.db.stockMovement.count({ where: { itemId: id } }),
      this.prisma.db.stockMovement.findMany({
        where: { itemId: id },
        select: {
          id: true,
          movementType: true,
          quantity: true,
          justification: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { item, ...this.page(items, total, query) };
  }

  async move(
    id: string,
    dto: CreateStockMovementDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ) {
    this.requireAdmin(actor);
    // Defesa também no serviço: nenhum caminho interno pode criar estoque
    // negativo ou ultrapassar o limite da coluna inteira do PostgreSQL.
    if (
      !Number.isInteger(dto.quantity) ||
      dto.quantity < 1 ||
      dto.quantity > 1_000_000 ||
      !['ENTRY', 'EXIT'].includes(dto.movementType)
    ) {
      throw new BadRequestException(
        'Informe uma movimentação e quantidade válidas',
      );
    }
    return this.mutate(async (db) => {
      await this.requireItem(db, id);
      const entry = dto.movementType === 'ENTRY';
      const changed = await db.inventoryItem.updateMany({
        where: {
          id,
          stockQuantity: entry
            ? { lte: MAX_STOCK - dto.quantity }
            : { gte: dto.quantity },
        },
        data: {
          stockQuantity: entry
            ? { increment: dto.quantity }
            : { decrement: dto.quantity },
        },
      });
      if (changed.count !== 1) {
        throw new ConflictException(
          entry
            ? 'Esta entrada excede o limite de unidades do item'
            : 'Saldo insuficiente para esta saída. Atualize e confira o estoque',
        );
      }
      const movement = await db.stockMovement.create({
        data: {
          itemId: id,
          userId: actor.sub,
          movementType: dto.movementType,
          quantity: dto.quantity,
          justification: dto.justification,
        },
        select: { id: true },
      });
      await this.audit.log(
        {
          actor,
          action: entry ? 'inventory.entry' : 'inventory.exit',
          resource: 'InventoryItem',
          resourceId: id,
          metadata: {
            movementId: movement.id,
            quantity: dto.quantity,
            justification: dto.justification,
          },
          ...ctx,
        },
        db,
      );
      return this.requireItem(db, id);
    });
  }

  private requireAdmin(actor: AuthUser) {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) {
      throw new ForbiddenException('Estoque restrito à administração');
    }
  }

  private where(query: ListInventoryDto): Prisma.InventoryItemWhereInput {
    return {
      ...(query.lowStock
        ? {
            stockQuantity: {
              lte: this.prisma.db.inventoryItem.fields.minimumStock,
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private async requireItem(db: DbClient, id: string) {
    const item = await db.inventoryItem.findUnique({
      where: { id },
      select: itemSelect,
    });
    if (!item) throw new NotFoundException('Item de estoque não encontrado');
    return item;
  }

  private page<T>(items: T[], total: number, query: InventoryPageDto) {
    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  private changedError() {
    return new ConflictException(
      'O estoque foi alterado por outra pessoa. Atualize e tente novamente',
    );
  }

  private async mutate<T>(callback: (db: DbClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.db.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isTransactionConflict(error)) {
        throw this.changedError();
      }
      throw error;
    }
  }
}
