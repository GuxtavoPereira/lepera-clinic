import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type {
  FinancialPaymentMethod,
  FinancialStatus,
  FinancialType,
} from '@lepera/contracts';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { FinancialService } from './financial.service';
import { FinancialQueryDto } from './dto/financial.dto';

type AppointmentRow = {
  id: string;
  startDatetime: Date;
  status: string;
  patient: { user: { name: string } };
  doctor: { user: { name: string } };
  transaction: { id: string } | null;
};
type Row = {
  id: string;
  userId: string;
  type: FinancialType;
  status: FinancialStatus;
  amount: Prisma.Decimal;
  description: string;
  category: string;
  dueDate: Date;
  transactionDate: Date;
  paidAt: Date | null;
  paymentMethod: FinancialPaymentMethod | null;
  cancelReason: string | null;
  appointmentId: string | null;
  appointment: AppointmentRow | null;
  user: { name: string };
  createdAt: Date;
  updatedAt: Date;
};
type Group = {
  type: FinancialType;
  status?: FinancialStatus;
  _sum: { amount: Prisma.Decimal | null };
};
type Write = {
  where: { id: string; status: FinancialStatus; updatedAt: Date };
  data: Partial<Row>;
};
const admin: AuthUser = { sub: 'admin-user', role: 'ADMIN' };
const reception: AuthUser = { sub: 'reception-user', role: 'RECEPTIONIST' };
const create = {
  type: 'INCOME' as const,
  amount: '180.50',
  description: 'Sessão demonstrativa',
  category: 'Consultas',
  dueDate: '2026-11-01',
};
const version = '2026-10-29T12:00:00.000Z';
const payment = {
  paidAt: '2026-11-01',
  paymentMethod: 'PIX' as const,
  expectedUpdatedAt: version,
};
const query = () =>
  Object.assign(new FinancialQueryDto(), {
    from: '2026-11-01',
    to: '2026-11-30',
  });

// Os matchers do Jest retornam `any`; este limite mantém os dados de teste como unknown.
const containing = (value: Record<string, unknown>): unknown =>
  expect.objectContaining(value);

function baseRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'financial-1',
    userId: reception.sub,
    type: 'INCOME',
    status: 'PENDING',
    amount: new Prisma.Decimal('180.50'),
    description: 'Sessão demonstrativa',
    category: 'Consultas',
    dueDate: new Date('2026-11-01T00:00:00Z'),
    transactionDate: new Date('2026-11-01T00:00:00Z'),
    paidAt: null,
    paymentMethod: null,
    cancelReason: null,
    appointmentId: null,
    appointment: null,
    user: { name: 'Recepção' },
    createdAt: new Date('2026-10-29T12:00:00Z'),
    updatedAt: new Date('2026-10-29T12:00:00Z'),
    ...overrides,
  };
}

describe('FinancialService', () => {
  let current: Row;
  let service: FinancialService;
  let findUnique: jest.Mock<Promise<Row | null>, [unknown]>;
  let findMany: jest.Mock<Promise<Row[]>, [unknown]>;
  let count: jest.Mock<Promise<number>, [unknown]>;
  let groupBy: jest.Mock<Promise<Group[]>, [unknown]>;
  let createRow: jest.Mock<Promise<Row>, [unknown]>;
  let updateMany: jest.Mock<Promise<{ count: number }>, [Write]>;
  let appointmentFindUnique: jest.Mock<
    Promise<AppointmentRow | null>,
    [unknown]
  >;
  let appointmentFindMany: jest.Mock<Promise<AppointmentRow[]>, [unknown]>;
  let transaction: jest.Mock<
    Promise<unknown>,
    [((db: unknown) => Promise<unknown>) | Promise<unknown>[], unknown?]
  >;
  let log: jest.Mock<Promise<unknown>, [unknown, unknown]>;
  let db: Record<string, unknown>;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-02T12:00:00Z'));
    current = baseRow();
    findUnique = jest.fn<Promise<Row | null>, [unknown]>(() =>
      Promise.resolve({ ...current }),
    );
    findMany = jest.fn<Promise<Row[]>, [unknown]>(() =>
      Promise.resolve([current]),
    );
    count = jest.fn<Promise<number>, [unknown]>(() => Promise.resolve(1));
    groupBy = jest.fn<Promise<Group[]>, [unknown]>(() => Promise.resolve([]));
    createRow = jest.fn<Promise<Row>, [unknown]>(() =>
      Promise.resolve(current),
    );
    updateMany = jest.fn(({ where, data }: Write) => {
      // Estado compartilhado simula o compare-and-swap do UPDATE no banco.
      if (
        where.id !== current.id ||
        where.status !== current.status ||
        where.updatedAt.getTime() !== current.updatedAt.getTime()
      )
        return Promise.resolve({ count: 0 });
      current = {
        ...current,
        ...Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined),
        ),
        updatedAt: new Date(current.updatedAt.getTime() + 1),
      };
      return Promise.resolve({ count: 1 });
    });
    appointmentFindUnique = jest.fn<Promise<AppointmentRow | null>, [unknown]>(
      () =>
        Promise.resolve({
          id: 'appointment-1',
          status: 'CONFIRMED',
          transaction: null,
          startDatetime: new Date('2026-11-01T12:00:00Z'),
          patient: { user: { name: 'Paciente' } },
          doctor: { user: { name: 'Profissional' } },
        }),
    );
    appointmentFindMany = jest.fn<Promise<AppointmentRow[]>, [unknown]>(() =>
      Promise.resolve([]),
    );
    log = jest.fn<Promise<unknown>, [unknown, unknown]>(() =>
      Promise.resolve({}),
    );
    db = {
      financialTransaction: {
        findUnique,
        findMany,
        count,
        groupBy,
        create: createRow,
        updateMany,
      },
      appointment: {
        findUnique: appointmentFindUnique,
        findMany: appointmentFindMany,
        count,
      },
    };
    transaction = jest.fn<
      Promise<unknown>,
      [((db: unknown) => Promise<unknown>) | Promise<unknown>[], unknown?]
    >((input) =>
      typeof input === 'function' ? input(db) : Promise.all(input),
    );
    service = new FinancialService(
      { db: { ...db, $transaction: transaction } } as unknown as PrismaService,
      { log } as unknown as AuditService,
    );
  });

  afterEach(() => jest.useRealTimers());

  it.each(['PATIENT', 'DOCTOR'] as const)(
    'rejects %s on every financial operation even without controller guards',
    async (role) => {
      const actor: AuthUser = { sub: 'blocked', role };
      const operations = [
        () => service.findAll(query(), actor),
        () => service.summary(query(), actor),
        () => service.export(query(), actor),
        () => service.appointments({ page: 1, pageSize: 20 }, actor),
        () => service.create(create, actor),
        () =>
          service.update(
            current.id,
            { amount: '1', expectedUpdatedAt: version },
            actor,
          ),
        () => service.settle(current.id, payment, actor),
        () =>
          service.cancel(
            current.id,
            { expectedUpdatedAt: version, reason: 'Motivo' },
            actor,
          ),
        () => service.reopen(current.id, { expectedUpdatedAt: version }, actor),
      ];
      for (const operation of operations)
        await expect(operation()).rejects.toBeInstanceOf(ForbiddenException);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it('forces reception listings, summary and exports to income', async () => {
    await service.findAll(query(), reception);
    await service.summary(query(), reception);
    await service.export(query(), reception);
    expect(findMany).toHaveBeenCalledWith(
      containing({
        where: containing({ type: 'INCOME' }),
      }),
    );
    expect(groupBy).toHaveBeenCalledWith(
      containing({
        where: containing({ type: 'INCOME' }),
      }),
    );
    const expenseQuery = Object.assign(query(), { type: 'EXPENSE' as const });
    await expect(
      service.findAll(expenseQuery, reception),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.summary(expenseQuery, reception),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.export(expenseQuery, reception),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.create({ ...create, type: 'EXPENSE' }, reception),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks reception from editing, settling or cancelling expenses by guessed ID', async () => {
    current = baseRow({ type: 'EXPENSE' });
    await expect(
      service.update(
        current.id,
        { amount: '1', expectedUpdatedAt: version },
        reception,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.settle(current.id, payment, reception),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.cancel(
        current.id,
        { expectedUpdatedAt: version, reason: 'Motivo' },
        reception,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateMany).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('serializes money as a decimal string, hides unrelated data and derives overdue by civil day', async () => {
    const result = await service.findAll(query(), admin);
    expect(result).toMatchObject({
      total: 1,
      page: 1,
      totalPages: 1,
      items: [
        {
          amount: '180.50',
          dueDate: '2026-11-01',
          displayStatus: 'OVERDUE',
          createdBy: 'Recepção',
        },
      ],
    });
    expect(result.items[0]).not.toHaveProperty('user');
    expect(result.items[0]).not.toHaveProperty('userId');
    expect(result.items[0]).not.toHaveProperty('transactionDate');
  });

  it('keeps the inclusive period and search in overdue filters used by list, summary and export', async () => {
    const filtered = Object.assign(query(), {
      status: 'OVERDUE' as const,
      search: 'Paciente',
      type: 'INCOME' as const,
    });
    await service.findAll(filtered, admin);
    await service.summary(filtered, admin);
    await service.export(filtered, admin);
    const expected = containing({
      type: 'INCOME',
      status: 'PENDING',
      dueDate: {
        gte: new Date('2026-11-01T00:00:00Z'),
        lte: new Date('2026-11-30T00:00:00Z'),
      },
      AND: [{ dueDate: { lt: new Date('2026-11-02T00:00:00Z') } }],
      OR: expect.arrayContaining([
        { description: { contains: 'Paciente', mode: 'insensitive' } },
      ]),
    });
    expect(findMany).toHaveBeenNthCalledWith(
      1,
      containing({ where: expected }),
    );
    expect(findMany).toHaveBeenNthCalledWith(
      2,
      containing({ where: expected }),
    );
    expect(groupBy).toHaveBeenNthCalledWith(1, containing({ where: expected }));
  });

  it('sums exact monetary amounts and excludes cancelled entries from totals', async () => {
    groupBy
      .mockResolvedValueOnce([
        {
          type: 'INCOME',
          status: 'PAID',
          _sum: { amount: new Prisma.Decimal('0.30') },
        },
        {
          type: 'EXPENSE',
          status: 'PAID',
          _sum: { amount: new Prisma.Decimal('0.10') },
        },
        {
          type: 'INCOME',
          status: 'PENDING',
          _sum: { amount: new Prisma.Decimal('180.50') },
        },
        {
          type: 'EXPENSE',
          status: 'CANCELLED',
          _sum: { amount: new Prisma.Decimal('2000') },
        },
      ])
      .mockResolvedValueOnce([
        { type: 'INCOME', _sum: { amount: new Prisma.Decimal('80.50') } },
      ]);
    await expect(service.summary(query(), admin)).resolves.toEqual({
      incomePaid: '0.30',
      expensePaid: '0.10',
      balance: '0.20',
      incomePending: '180.50',
      expensePending: '0.00',
      incomeOverdue: '80.50',
      expenseOverdue: '0.00',
      totalCount: 1,
    });
  });

  it('does not silently truncate exports larger than 5000 records', async () => {
    findMany.mockResolvedValue(Array.from({ length: 5001 }, () => current));
    await expect(service.export(query(), admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('offers only unbilled active appointments and normalizes their public labels', async () => {
    const appointment = await appointmentFindUnique({});
    appointmentFindMany.mockResolvedValue(appointment ? [appointment] : []);
    const result = await service.appointments(
      { page: 1, pageSize: 20, q: 'Paciente' },
      reception,
    );
    expect(appointmentFindMany).toHaveBeenCalledWith(
      containing({
        where: containing({
          transaction: { is: null },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'WAITING', 'COMPLETED'] },
        }),
      }),
    );
    expect(result.items[0]).toEqual({
      id: 'appointment-1',
      startDatetime: '2026-11-01T12:00:00.000Z',
      status: 'CONFIRMED',
      patientName: 'Paciente',
      doctorName: 'Profissional',
    });
  });

  it('creates a pending charge and commits audit with the same transaction client', async () => {
    await service.create(
      { ...create, appointmentId: 'appointment-1' },
      reception,
      { ip: '127.0.0.1' },
    );
    expect(createRow).toHaveBeenCalledWith(
      containing({
        data: containing({
          status: 'PENDING',
          amount: new Prisma.Decimal('180.50'),
          userId: reception.sub,
          appointmentId: 'appointment-1',
        }),
      }),
    );
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(log).toHaveBeenCalledWith(
      containing({
        action: 'financial.create',
        actor: reception,
        ip: '127.0.0.1',
        resource: 'FinancialTransaction',
      }),
      db,
    );
  });

  it('allows administrators to record manual expenses but not attach an appointment to them', async () => {
    await expect(
      service.create({ ...create, type: 'EXPENSE' }, admin),
    ).resolves.toBeDefined();
    await expect(
      service.create(
        { ...create, type: 'EXPENSE', appointmentId: 'appointment-1' },
        admin,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['CANCELLED', 'RESCHEDULED'])(
    'rejects charges for %s appointments',
    async (status) => {
      const appointment = await appointmentFindUnique({});
      appointmentFindUnique.mockResolvedValue(
        appointment ? { ...appointment, status } : null,
      );
      await expect(
        service.create({ ...create, appointmentId: 'appointment-1' }, admin),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(createRow).not.toHaveBeenCalled();
    },
  );

  it('rejects nonexistent or already billed appointments and maps concurrent unique conflicts', async () => {
    appointmentFindUnique.mockResolvedValueOnce(null);
    await expect(
      service.create({ ...create, appointmentId: 'missing' }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
    const appointment = await appointmentFindUnique({});
    appointmentFindUnique.mockResolvedValueOnce(
      appointment ? { ...appointment, transaction: { id: 'existing' } } : null,
    );
    await expect(
      service.create({ ...create, appointmentId: 'appointment-1' }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
    createRow.mockRejectedValueOnce({ code: 'P2002' });
    await expect(
      service.create({ ...create, appointmentId: 'appointment-1' }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects zero amounts and impossible dates before creating data', async () => {
    await expect(
      service.create({ ...create, amount: '0.00' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({ ...create, dueDate: '2026-02-30' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('edits a pending entry with an optimistic concurrency check', async () => {
    await expect(
      service.update(
        current.id,
        { amount: '200.25', dueDate: '2026-11-10', expectedUpdatedAt: version },
        admin,
      ),
    ).resolves.toMatchObject({ amount: '200.25', dueDate: '2026-11-10' });
    expect(updateMany).toHaveBeenCalledWith(
      containing({
        where: {
          id: 'financial-1',
          status: 'PENDING',
          updatedAt: new Date('2026-10-29T12:00:00Z'),
        },
      }),
    );
    expect(log).toHaveBeenCalledWith(
      containing({
        action: 'financial.update',
        metadata: containing({
          previousAmount: '180.50',
          amount: '200.25',
        }),
      }),
      db,
    );
  });

  it.each(['PAID', 'CANCELLED'] as const)(
    'does not edit or settle %s entries',
    async (status) => {
      current = baseRow({ status });
      await expect(
        service.update(
          current.id,
          { amount: '1', expectedUpdatedAt: version },
          admin,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        service.settle(current.id, payment, admin),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(updateMany).not.toHaveBeenCalled();
    },
  );

  it('rejects empty edits and missing entries', async () => {
    await expect(
      service.update(current.id, { expectedUpdatedAt: version }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    findUnique.mockResolvedValue(null);
    await expect(
      service.settle('missing', payment, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('settles once with date, method and audit; a duplicate submission is rejected', async () => {
    await expect(
      service.settle(current.id, payment, reception),
    ).resolves.toMatchObject({
      status: 'PAID',
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
    });
    await expect(
      service.settle(current.id, payment, reception),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      containing({ action: 'financial.settle', actor: reception }),
      db,
    );
  });

  it('allows only one settlement when both callers read the same pending version', async () => {
    const results = await Promise.allSettled([
      service.settle(current.id, payment, admin),
      service.settle(current.id, payment, reception),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
    expect(log).toHaveBeenCalledTimes(1);
    expect(current.status).toBe('PAID');
  });

  it('rejects payment confirmation from an old dialog after another operator changes the amount', async () => {
    await service.update(
      current.id,
      { amount: '999.99', expectedUpdatedAt: version },
      admin,
    );
    log.mockClear();
    updateMany.mockClear();
    await expect(
      service.settle(current.id, payment, reception),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(current.amount.toFixed(2)).toBe('999.99');
    expect(current.status).toBe('PENDING');
    expect(updateMany).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    await expect(
      service.settle(
        current.id,
        { ...payment, expectedUpdatedAt: current.updatedAt.toISOString() },
        reception,
      ),
    ).resolves.toMatchObject({ status: 'PAID', amount: '999.99' });
  });

  it.each(['update', 'cancel', 'reopen'] as const)(
    'rejects %s from a previously loaded version before changing data',
    async (operation) => {
      current = baseRow({
        updatedAt: new Date('2026-10-29T12:00:01.000Z'),
        status: operation === 'reopen' ? 'CANCELLED' : 'PENDING',
      });
      const actions = {
        update: () =>
          service.update(
            current.id,
            { amount: '1.00', expectedUpdatedAt: version },
            admin,
          ),
        cancel: () =>
          service.cancel(
            current.id,
            { reason: 'Revisão', expectedUpdatedAt: version },
            admin,
          ),
        reopen: () =>
          service.reopen(current.id, { expectedUpdatedAt: version }, admin),
      };
      await expect(actions[operation]()).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(updateMany).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    },
  );

  it('rejects a settlement after today in São Paulo, even before UTC changes locally', async () => {
    jest.setSystemTime(new Date('2026-11-02T01:00:00Z'));
    await expect(
      service.settle(current.id, { ...payment, paidAt: '2026-11-02' }, admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('blocks reception reversals while admin reversals preserve the original payment evidence', async () => {
    current = baseRow({
      status: 'PAID',
      paidAt: new Date('2026-11-01T00:00:00Z'),
      paymentMethod: 'PIX',
    });
    await expect(
      service.cancel(
        current.id,
        { expectedUpdatedAt: version, reason: 'Lançamento indevido' },
        reception,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.cancel(
        current.id,
        { expectedUpdatedAt: version, reason: 'Lançamento indevido' },
        admin,
      ),
    ).resolves.toMatchObject({
      status: 'CANCELLED',
      paidAt: '2026-11-01',
      paymentMethod: 'PIX',
      cancelReason: 'Lançamento indevido',
    });
    expect(log).toHaveBeenCalledWith(
      containing({
        action: 'financial.reverse',
        metadata: containing({
          previousStatus: 'PAID',
          reason: 'Lançamento indevido',
        }),
      }),
      db,
    );
  });

  it('allows reception to cancel a pending charge but cannot cancel again', async () => {
    await expect(
      service.cancel(
        current.id,
        { expectedUpdatedAt: version, reason: 'Cobrança incorreta' },
        reception,
      ),
    ).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(
      service.cancel(
        current.id,
        { expectedUpdatedAt: version, reason: 'Novamente' },
        reception,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      containing({ action: 'financial.cancel' }),
      db,
    );
  });

  it('only administrators can reopen cancelled entries and clearing payment details is audited', async () => {
    current = baseRow({
      status: 'CANCELLED',
      paidAt: new Date('2026-11-01T00:00:00Z'),
      paymentMethod: 'PIX',
      cancelReason: 'Revisão',
    });
    await expect(
      service.reopen(current.id, { expectedUpdatedAt: version }, reception),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.reopen(
        current.id,
        { expectedUpdatedAt: version },
        { sub: 'root', role: 'SUPER_ADMIN' },
      ),
    ).resolves.toMatchObject({
      status: 'PENDING',
      paidAt: null,
      paymentMethod: null,
      cancelReason: null,
    });
    expect(log).toHaveBeenCalledWith(
      containing({ action: 'financial.reopen' }),
      db,
    );
  });

  it('does not reopen a cancelled entry associated with a cancelled appointment', async () => {
    current = baseRow({ status: 'CANCELLED', appointmentId: 'appointment-1' });
    const appointment = await appointmentFindUnique({});
    appointmentFindUnique.mockResolvedValue(
      appointment ? { ...appointment, status: 'CANCELLED' } : null,
    );
    await expect(
      service.reopen(current.id, { expectedUpdatedAt: version }, admin),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('rejects stale writes and translates serialization conflicts without hiding other failures', async () => {
    updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.update(
        current.id,
        { amount: '200', expectedUpdatedAt: version },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(log).not.toHaveBeenCalled();
    transaction.mockRejectedValueOnce({ code: 'P2034' });
    await expect(service.create(create, admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const outage = new Error('Database unavailable');
    transaction.mockRejectedValueOnce(outage);
    await expect(service.create(create, admin)).rejects.toBe(outage);
  });

  it('fails the mutation if the transactional audit cannot be written', async () => {
    const failure = new Error('Audit unavailable');
    log.mockRejectedValueOnce(failure);
    await expect(service.create(create, admin)).rejects.toBe(failure);
    expect(log).toHaveBeenCalledWith(
      containing({ resource: 'FinancialTransaction' }),
      db,
    );
  });
});
