import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type {
  FinancialAppointment,
  FinancialEntry,
  FinancialPage,
  FinancialSummary,
  FinancialType,
} from '@lepera/contracts';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { DbClient } from '../../prisma/prisma.types';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../audit/request-context';
import {
  CancelFinancialDto,
  CreateFinancialDto,
  FinancialAppointmentQueryDto,
  FinancialQueryDto,
  ReopenFinancialDto,
  SettleFinancialDto,
  UpdateFinancialDto,
} from './dto/financial.dto';
import {
  financialAmount,
  financialDate,
  financialRange,
  financialToday,
} from './financial.utils';

const appointmentSelect = {
  id: true,
  startDatetime: true,
  status: true,
  patient: { select: { user: { select: { name: true } } } },
  doctor: { select: { user: { select: { name: true } } } },
} satisfies Prisma.AppointmentSelect;

const entryInclude = {
  user: { select: { name: true } },
  appointment: { select: appointmentSelect },
} satisfies Prisma.FinancialTransactionInclude;

type EntryRow = Prisma.FinancialTransactionGetPayload<{
  include: typeof entryInclude;
}>;
type AppointmentRow = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;
const RESOURCE = 'FinancialTransaction';

@Injectable()
export class FinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(
    query: FinancialQueryDto,
    actor: AuthUser,
  ): Promise<FinancialPage<FinancialEntry>> {
    const today = financialToday();
    const where = this.where(query, actor, today);
    const [total, rows] = await this.prisma.db.$transaction(
      [
        this.prisma.db.financialTransaction.count({ where }),
        this.prisma.db.financialTransaction.findMany({
          where,
          include: entryInclude,
          orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return this.page(
      rows.map((row) => this.entry(row, today)),
      total,
      query,
    );
  }

  async summary(
    query: FinancialQueryDto,
    actor: AuthUser,
  ): Promise<FinancialSummary> {
    const today = financialToday();
    const where = this.where(query, actor, today);
    const [groups, overdue, totalCount] = await this.prisma.db.$transaction(
      [
        this.prisma.db.financialTransaction.groupBy({
          by: ['type', 'status'],
          orderBy: [{ type: 'asc' }, { status: 'asc' }],
          where,
          _sum: { amount: true },
        }),
        this.prisma.db.financialTransaction.groupBy({
          by: ['type'],
          orderBy: { type: 'asc' },
          where: {
            AND: [
              where,
              { status: 'PENDING', dueDate: { lt: financialDate(today) } },
            ],
          },
          _sum: { amount: true },
        }),
        this.prisma.db.financialTransaction.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const sum = (type: FinancialType, status: 'PAID' | 'PENDING') =>
      groups.find((row) => row.type === type && row.status === status)?._sum
        ?.amount ?? new Prisma.Decimal(0);
    const late = (type: FinancialType) =>
      overdue.find((row) => row.type === type)?._sum?.amount ??
      new Prisma.Decimal(0);
    const incomePaid = sum('INCOME', 'PAID');
    const expensePaid = sum('EXPENSE', 'PAID');
    return {
      incomePaid: incomePaid.toFixed(2),
      expensePaid: expensePaid.toFixed(2),
      incomePending: sum('INCOME', 'PENDING').toFixed(2),
      expensePending: sum('EXPENSE', 'PENDING').toFixed(2),
      incomeOverdue: late('INCOME').toFixed(2),
      expenseOverdue: late('EXPENSE').toFixed(2),
      balance: incomePaid.minus(expensePaid).toFixed(2),
      totalCount,
    };
  }

  async export(query: FinancialQueryDto, actor: AuthUser) {
    const today = financialToday();
    const where = this.where(query, actor, today);
    // Uma linha a mais detecta o limite sem exportar silenciosamente só parte.
    const rows = await this.prisma.db.financialTransaction.findMany({
      where,
      include: entryInclude,
      orderBy: [{ dueDate: 'desc' }, { id: 'desc' }],
      take: 5001,
    });
    if (rows.length > 5000) {
      throw new BadRequestException(
        'A exportação permite até 5.000 lançamentos. Reduza o período ou os filtros',
      );
    }
    return { items: rows.map((row) => this.entry(row, today)) };
  }

  async appointments(
    query: FinancialAppointmentQueryDto,
    actor: AuthUser,
  ): Promise<FinancialPage<FinancialAppointment>> {
    this.requireRole(actor);
    const where: Prisma.AppointmentWhereInput = {
      status: { in: ['SCHEDULED', 'CONFIRMED', 'WAITING', 'COMPLETED'] },
      transaction: { is: null },
      ...(query.q
        ? {
            OR: [
              {
                patient: {
                  user: { name: { contains: query.q, mode: 'insensitive' } },
                },
              },
              {
                doctor: {
                  user: { name: { contains: query.q, mode: 'insensitive' } },
                },
              },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.db.$transaction(
      [
        this.prisma.db.appointment.count({ where }),
        this.prisma.db.appointment.findMany({
          where,
          select: appointmentSelect,
          orderBy: [{ startDatetime: 'desc' }, { id: 'desc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return this.page(
      rows.map((row) => this.appointment(row)),
      total,
      query,
    );
  }

  async create(
    dto: CreateFinancialDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ): Promise<FinancialEntry> {
    this.requireRole(actor, dto.type);
    if (dto.appointmentId && dto.type !== 'INCOME') {
      throw new BadRequestException(
        'Somente receitas podem vincular consultas',
      );
    }
    const amount = financialAmount(dto.amount);
    const dueDate = financialDate(dto.dueDate);
    return this.mutate(async (db) => {
      if (dto.appointmentId) {
        await this.requireEligibleAppointment(db, dto.appointmentId);
      }
      const row = await db.financialTransaction.create({
        data: {
          type: dto.type,
          amount,
          description: dto.description,
          category: dto.category,
          dueDate,
          transactionDate: dueDate,
          status: 'PENDING',
          userId: actor.sub,
          appointmentId: dto.appointmentId,
        },
        include: entryInclude,
      });
      await this.audit.log(
        {
          actor,
          action: 'financial.create',
          resource: RESOURCE,
          resourceId: row.id,
          metadata: {
            type: dto.type,
            amount: amount.toFixed(2),
            dueDate: dto.dueDate,
          },
          ...ctx,
        },
        db,
      );
      return this.entry(row);
    });
  }

  async update(
    id: string,
    dto: UpdateFinancialDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ): Promise<FinancialEntry> {
    this.requireRole(actor);
    if (
      ![dto.amount, dto.description, dto.category, dto.dueDate].some(
        (value) => value !== undefined,
      )
    ) {
      throw new BadRequestException('Informe os dados a alterar');
    }
    const amount =
      dto.amount === undefined ? undefined : financialAmount(dto.amount);
    const dueDate =
      dto.dueDate === undefined ? undefined : financialDate(dto.dueDate);
    return this.mutate(async (db) => {
      const row = await this.requireEntry(db, id, actor);
      this.requireVersion(row, dto.expectedUpdatedAt);
      if (row.status !== 'PENDING') {
        throw new ConflictException(
          'Somente lançamentos pendentes podem ser editados',
        );
      }
      const result = await db.financialTransaction.updateMany({
        where: { id, status: 'PENDING', updatedAt: row.updatedAt },
        data: {
          amount,
          dueDate,
          description: dto.description,
          category: dto.category,
        },
      });
      this.requireChanged(result.count);
      await this.audit.log(
        {
          actor,
          action: 'financial.update',
          resource: RESOURCE,
          resourceId: id,
          metadata: {
            previousAmount: row.amount.toFixed(2),
            amount: (amount ?? row.amount).toFixed(2),
            previousDueDate: row.dueDate.toISOString().slice(0, 10),
            dueDate: dto.dueDate ?? row.dueDate.toISOString().slice(0, 10),
          },
          ...ctx,
        },
        db,
      );
      return this.entry(await this.requireEntry(db, id, actor));
    });
  }

  async settle(
    id: string,
    dto: SettleFinancialDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ): Promise<FinancialEntry> {
    this.requireRole(actor);
    const paidAt = financialDate(dto.paidAt);
    if (dto.paidAt > financialToday()) {
      throw new BadRequestException('O pagamento não pode ter uma data futura');
    }
    return this.mutate(async (db) => {
      const row = await this.requireEntry(db, id, actor);
      this.requireVersion(row, dto.expectedUpdatedAt);
      if (row.status !== 'PENDING') {
        throw new ConflictException('Este lançamento não está pendente');
      }
      const result = await db.financialTransaction.updateMany({
        where: { id, status: 'PENDING', updatedAt: row.updatedAt },
        data: {
          status: 'PAID',
          paidAt,
          paymentMethod: dto.paymentMethod,
          transactionDate: new Date(`${dto.paidAt}T12:00:00.000Z`),
        },
      });
      this.requireChanged(result.count);
      await this.audit.log(
        {
          actor,
          action: 'financial.settle',
          resource: RESOURCE,
          resourceId: id,
          metadata: {
            amount: row.amount.toFixed(2),
            paidAt: dto.paidAt,
            paymentMethod: dto.paymentMethod,
          },
          ...ctx,
        },
        db,
      );
      return this.entry(await this.requireEntry(db, id, actor));
    });
  }

  async cancel(
    id: string,
    dto: CancelFinancialDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ): Promise<FinancialEntry> {
    this.requireRole(actor);
    return this.mutate(async (db) => {
      const row = await this.requireEntry(db, id, actor);
      this.requireVersion(row, dto.expectedUpdatedAt);
      if (row.status === 'CANCELLED') {
        throw new ConflictException('Este lançamento já foi cancelado');
      }
      if (row.status === 'PAID' && actor.role === 'RECEPTIONIST') {
        throw new ForbiddenException(
          'Somente a administração pode estornar registros pagos',
        );
      }
      const result = await db.financialTransaction.updateMany({
        where: { id, status: row.status, updatedAt: row.updatedAt },
        data: { status: 'CANCELLED', cancelReason: dto.reason },
      });
      this.requireChanged(result.count);
      await this.audit.log(
        {
          actor,
          action:
            row.status === 'PAID' ? 'financial.reverse' : 'financial.cancel',
          resource: RESOURCE,
          resourceId: id,
          metadata: {
            previousStatus: row.status,
            amount: row.amount.toFixed(2),
            reason: dto.reason,
          },
          ...ctx,
        },
        db,
      );
      return this.entry(await this.requireEntry(db, id, actor));
    });
  }

  async reopen(
    id: string,
    dto: ReopenFinancialDto,
    actor: AuthUser,
    ctx: RequestContext = {},
  ): Promise<FinancialEntry> {
    this.requireRole(actor);
    if (actor.role === 'RECEPTIONIST') {
      throw new ForbiddenException(
        'Somente a administração pode reabrir lançamentos',
      );
    }
    return this.mutate(async (db) => {
      const row = await this.requireEntry(db, id, actor);
      this.requireVersion(row, dto.expectedUpdatedAt);
      if (row.status !== 'CANCELLED') {
        throw new ConflictException(
          'Somente lançamentos cancelados podem ser reabertos',
        );
      }
      if (row.appointmentId) {
        await this.requireEligibleAppointment(db, row.appointmentId, false);
      }
      const result = await db.financialTransaction.updateMany({
        where: { id, status: 'CANCELLED', updatedAt: row.updatedAt },
        data: {
          status: 'PENDING',
          paidAt: null,
          paymentMethod: null,
          cancelReason: null,
        },
      });
      this.requireChanged(result.count);
      await this.audit.log(
        {
          actor,
          action: 'financial.reopen',
          resource: RESOURCE,
          resourceId: id,
          metadata: {
            amount: row.amount.toFixed(2),
            previousStatus: row.status,
          },
          ...ctx,
        },
        db,
      );
      return this.entry(await this.requireEntry(db, id, actor));
    });
  }

  private requireRole(actor: AuthUser, type?: FinancialType) {
    if (!['ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST'].includes(actor.role)) {
      throw new ForbiddenException('Acesso ao financeiro não permitido');
    }
    if (actor.role === 'RECEPTIONIST' && type === 'EXPENSE') {
      throw new ForbiddenException('Despesas são restritas à administração');
    }
  }

  private where(query: FinancialQueryDto, actor: AuthUser, today: string) {
    this.requireRole(actor, query.type);
    const where: Prisma.FinancialTransactionWhereInput = {
      dueDate: financialRange(query.from, query.to),
      ...(actor.role === 'RECEPTIONIST'
        ? { type: 'INCOME' }
        : query.type
          ? { type: query.type }
          : {}),
    };
    if (query.status === 'OVERDUE') {
      where.status = 'PENDING';
      where.AND = [{ dueDate: { lt: financialDate(today) } }];
    } else if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const contains = { contains: query.search, mode: 'insensitive' as const };
      where.OR = [
        { description: contains },
        { category: contains },
        { appointment: { patient: { user: { name: contains } } } },
        { appointment: { doctor: { user: { name: contains } } } },
      ];
    }
    return where;
  }

  private async requireEntry(db: DbClient, id: string, actor: AuthUser) {
    const row = await db.financialTransaction.findUnique({
      where: { id },
      include: entryInclude,
    });
    if (!row) throw new NotFoundException('Lançamento não encontrado');
    this.requireRole(actor, row.type);
    return row;
  }

  private async requireEligibleAppointment(
    db: DbClient,
    id: string,
    unbilled = true,
  ) {
    const appointment = await db.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, transaction: { select: { id: true } } },
    });
    if (!appointment) throw new NotFoundException('Consulta não encontrada');
    if (['CANCELLED', 'RESCHEDULED'].includes(appointment.status)) {
      throw new ConflictException(
        'Não é possível cobrar uma consulta cancelada ou remarcada',
      );
    }
    if (unbilled && appointment.transaction) {
      throw new ConflictException(
        'Esta consulta já possui um lançamento financeiro',
      );
    }
  }

  private requireVersion(row: { updatedAt: Date }, expectedUpdatedAt: string) {
    if (row.updatedAt.toISOString() !== expectedUpdatedAt) {
      throw new ConflictException(
        'O lançamento foi alterado desde que você abriu a tela. Atualize a página e confira os dados',
      );
    }
  }

  private requireChanged(count: number) {
    if (count !== 1) {
      throw new ConflictException(
        'O lançamento foi alterado por outra pessoa. Atualize a página',
      );
    }
  }

  private async mutate<T>(callback: (db: DbClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.db.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'Esta consulta já possui um lançamento financeiro',
        );
      }
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2034'
      ) {
        throw new ConflictException(
          'Outra operação alterou estes dados. Atualize e tente novamente',
        );
      }
      throw error;
    }
  }

  private appointment(row: AppointmentRow): FinancialAppointment {
    return {
      id: row.id,
      startDatetime: row.startDatetime.toISOString(),
      status: row.status,
      patientName: row.patient.user.name,
      doctorName: row.doctor.user.name,
    };
  }

  private entry(row: EntryRow, today = financialToday()): FinancialEntry {
    const dueDate = row.dueDate.toISOString().slice(0, 10);
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      displayStatus:
        row.status === 'PENDING' && dueDate < today ? 'OVERDUE' : row.status,
      amount: row.amount.toFixed(2),
      description: row.description,
      category: row.category,
      dueDate,
      paidAt: row.paidAt?.toISOString().slice(0, 10) ?? null,
      paymentMethod: row.paymentMethod,
      cancelReason: row.cancelReason,
      appointmentId: row.appointmentId,
      appointment: row.appointment ? this.appointment(row.appointment) : null,
      createdBy: row.user.name,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private page<T>(
    items: T[],
    total: number,
    query: { page: number; pageSize: number },
  ): FinancialPage<T> {
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }
}
