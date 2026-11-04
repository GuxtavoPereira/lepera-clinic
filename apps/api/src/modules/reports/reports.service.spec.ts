import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import type { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService, reportMoney } from './reports.service';

type AppointmentRow = {
  doctorId: string;
  startDatetime: Date;
  endDatetime: Date;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  type: 'SESSION';
  modality: 'IN_PERSON';
  durationMinutes: number;
  patient: { user: { name: string } };
  doctor: { user: { name: string } };
};
type FinancialRow = {
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'CANCELLED';
  amount: Prisma.Decimal;
  description: string;
  category: string;
  dueDate: Date;
  paidAt: Date | null;
  paymentMethod: 'PIX' | null;
};
const admin: AuthUser = { sub: 'admin-user', role: 'ADMIN' };
const doctor: AuthUser = { sub: 'doctor-user', role: 'DOCTOR' };
const patient: AuthUser = { sub: 'patient-user', role: 'PATIENT' };
const reception: AuthUser = { sub: 'reception-user', role: 'RECEPTIONIST' };
const query = (overrides: Partial<ReportQueryDto> = {}): ReportQueryDto => ({
  kind: 'appointments',
  from: '2026-11-01',
  to: '2026-11-30',
  ...overrides,
});
const appointment = (): AppointmentRow => ({
  doctorId: 'doctor-1',
  startDatetime: new Date('2026-11-05T13:00:00Z'),
  endDatetime: new Date('2026-11-05T13:50:00Z'),
  status: 'CONFIRMED',
  type: 'SESSION',
  modality: 'IN_PERSON',
  durationMinutes: 50,
  patient: { user: { name: 'Paciente demonstração' } },
  doctor: { user: { name: 'Profissional demonstração' } },
});
const financial = (
  amount: string,
  overrides: Partial<FinancialRow> = {},
): FinancialRow => ({
  type: 'INCOME',
  status: 'PAID',
  amount: new Prisma.Decimal(amount),
  description: 'Sessão',
  category: 'Consultas',
  dueDate: new Date('2026-11-05T00:00:00Z'),
  paidAt: new Date('2026-11-05T00:00:00Z'),
  paymentMethod: 'PIX',
  ...overrides,
});

describe('ReportsService', () => {
  let service: ReportsService;
  let appointments: jest.Mock<Promise<AppointmentRow[]>, [unknown]>;
  let finances: jest.Mock<Promise<FinancialRow[]>, [unknown]>;
  let doctorProfile: jest.Mock<Promise<{ id: string } | null>, [unknown]>;
  let patientProfile: jest.Mock<Promise<{ id: string } | null>, [unknown]>;
  let inventory: jest.Mock<
    Promise<
      {
        name: string;
        stockQuantity: number;
        minimumStock: number;
        updatedAt: Date;
      }[]
    >,
    [unknown]
  >;
  let waitlist: jest.Mock<Promise<unknown[]>, [unknown]>;
  let requests: jest.Mock<Promise<unknown[]>, [unknown]>;
  let patients: jest.Mock<Promise<unknown[]>, [unknown]>;
  let stockMovements: jest.Mock<Promise<unknown[]>, [unknown]>;
  let reviews: jest.Mock<Promise<unknown[]>, [unknown]>;
  let audits: jest.Mock<Promise<unknown[]>, [unknown]>;

  beforeEach(() => {
    appointments = jest
      .fn<Promise<AppointmentRow[]>, [unknown]>()
      .mockResolvedValue([appointment()]);
    finances = jest
      .fn<Promise<FinancialRow[]>, [unknown]>()
      .mockResolvedValue([]);
    doctorProfile = jest
      .fn<Promise<{ id: string } | null>, [unknown]>()
      .mockResolvedValue({ id: 'own-doctor' });
    patientProfile = jest
      .fn<Promise<{ id: string } | null>, [unknown]>()
      .mockResolvedValue({ id: 'own-patient' });
    inventory = jest
      .fn<
        Promise<
          {
            name: string;
            stockQuantity: number;
            minimumStock: number;
            updatedAt: Date;
          }[]
        >,
        [unknown]
      >()
      .mockResolvedValue([]);
    waitlist = jest.fn<Promise<unknown[]>, [unknown]>().mockResolvedValue([]);
    requests = jest.fn<Promise<unknown[]>, [unknown]>().mockResolvedValue([]);
    patients = jest.fn<Promise<unknown[]>, [unknown]>().mockResolvedValue([]);
    stockMovements = jest
      .fn<Promise<unknown[]>, [unknown]>()
      .mockResolvedValue([]);
    reviews = jest.fn<Promise<unknown[]>, [unknown]>().mockResolvedValue([]);
    audits = jest.fn<Promise<unknown[]>, [unknown]>().mockResolvedValue([]);
    service = new ReportsService({
      db: {
        appointment: { findMany: appointments },
        doctor: { findUnique: doctorProfile },
        patient: { findUnique: patientProfile, findMany: patients },
        financialTransaction: { findMany: finances },
        inventoryItem: { findMany: inventory },
        waitlist: { findMany: waitlist },
        scheduleRequest: { findMany: requests },
        stockMovement: { findMany: stockMovements },
        review: { findMany: reviews },
        auditLog: { findMany: audits },
      },
    } as unknown as PrismaService);
  });

  it.each([
    admin,
    reception,
    { sub: 'root-user', role: 'SUPER_ADMIN' as const },
  ])(
    'permite agenda da clínica para $role com seleção sem prontuário',
    async (actor) => {
      const result = await service.preview(query(), actor);
      const request = appointments.mock.calls[0][0] as {
        where: Prisma.AppointmentWhereInput;
        select: Prisma.AppointmentSelect;
        take: number;
      };
      expect(request.where).toEqual({
        startDatetime: {
          gte: new Date('2026-11-01T03:00:00Z'),
          lt: new Date('2026-12-01T03:00:00Z'),
        },
      });
      expect(request.take).toBe(5001);
      expect(request.select).not.toHaveProperty('progressNote');
      expect(request.select).not.toHaveProperty('receptionNotes');
      expect(result.rows[0]).toContain('05/11/2026, 10:00');
      expect(result.rows[0]).toContain('Confirmada');
      expect(doctorProfile).not.toHaveBeenCalled();
      expect(patientProfile).not.toHaveBeenCalled();
    },
  );

  it('filtra o profissional no servidor antes da consulta e também na exportação', async () => {
    await service.preview(query(), doctor);
    await service.export({ ...query(), format: 'csv' }, doctor);
    expect(doctorProfile).toHaveBeenCalledWith({
      where: { userId: doctor.sub },
      select: { id: true },
    });
    for (const [request] of appointments.mock.calls) {
      expect(
        (request as { where: Prisma.AppointmentWhereInput }).where.doctorId,
      ).toBe('own-doctor');
    }
  });

  it('restringe o paciente ao próprio perfil', async () => {
    const result = await service.preview(query(), patient);
    expect(patientProfile).toHaveBeenCalledWith({
      where: { userId: patient.sub },
      select: { id: true },
    });
    expect(
      (appointments.mock.calls[0][0] as { where: Prisma.AppointmentWhereInput })
        .where.patientId,
    ).toBe('own-patient');
    expect(result.scopeLabel).toContain('paciente autenticado');
  });

  it('não faz consulta ampla se o perfil restrito não existir', async () => {
    doctorProfile.mockResolvedValue(null);
    patientProfile.mockResolvedValue(null);
    await expect(service.preview(query(), doctor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.preview(query(), patient)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(appointments).not.toHaveBeenCalled();
  });

  it.each([doctor, patient, reception])(
    'bloqueia finanças e estoque para $role antes de ler os dados',
    async (actor) => {
      for (const kind of [
        'financial',
        'inventory',
        'professionals',
        'demand',
        'patients',
        'stock-movements',
        'satisfaction',
        'audit',
      ] as const) {
        await expect(
          service.preview(query({ kind }), actor),
        ).rejects.toBeInstanceOf(ForbiddenException);
        await expect(
          service.export({ ...query({ kind }), format: 'pdf' }, actor),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
      expect(finances).not.toHaveBeenCalled();
      expect(inventory).not.toHaveBeenCalled();
      expect(waitlist).not.toHaveBeenCalled();
      expect(requests).not.toHaveBeenCalled();
      expect(patients).not.toHaveBeenCalled();
      expect(stockMovements).not.toHaveBeenCalled();
      expect(reviews).not.toHaveBeenCalled();
      expect(audits).not.toHaveBeenCalled();
    },
  );

  it.each([
    { from: '2026-02-30' },
    { from: '2026-12-01' },
    { from: '2025-01-01' },
    { from: '1899-01-01', to: '1899-01-01' },
    { to: '2026-13-01' },
  ])('rejeita período inválido %p antes de consultar', async (dates) => {
    await expect(service.preview(query(dates), admin)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(appointments).not.toHaveBeenCalled();
  });

  it('aceita o mesmo dia inclusivo e até 366 dias', async () => {
    await expect(
      service.preview(query({ from: '2026-11-05', to: '2026-11-05' }), admin),
    ).resolves.toHaveProperty('totalRows', 1);
    await expect(
      service.preview(query({ from: '2026-01-01', to: '2027-01-01' }), admin),
    ).resolves.toHaveProperty('totalRows', 1);
    await expect(
      service.preview(query({ from: '2026-01-01', to: '2027-01-02' }), admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('calcula dinheiro com Decimal, exclui cancelados e filtra pelo vencimento', async () => {
    finances.mockResolvedValue([
      financial('0.10'),
      financial('0.20'),
      financial('0.07', { type: 'EXPENSE' }),
      financial('99999.99', { status: 'CANCELLED' }),
      financial('12.34', { status: 'PENDING', paidAt: null }),
      financial('3.21', { status: 'PENDING', type: 'EXPENSE', paidAt: null }),
    ]);
    const result = await service.preview(query({ kind: 'financial' }), admin);
    expect(result.metrics).toEqual([
      { label: 'Receitas baixadas', value: 'R$ 0,30' },
      { label: 'Despesas baixadas', value: 'R$ 0,07' },
      { label: 'Saldo do período', value: 'R$ 0,23' },
      { label: 'A receber', value: 'R$ 12,34' },
      { label: 'A pagar', value: 'R$ 3,21' },
    ]);
    expect((finances.mock.calls[0][0] as { where: unknown }).where).toEqual({
      dueDate: {
        gte: new Date('2026-11-01T00:00:00Z'),
        lte: new Date('2026-11-30T00:00:00Z'),
      },
    });
    expect(reportMoney(new Prisma.Decimal('-1234.50'))).toBe('R$ -1.234,50');
  });

  it('rotula estoque como posição atual e identifica a reposição no limite mínimo', async () => {
    inventory.mockResolvedValue([
      {
        name: 'Papel',
        stockQuantity: 5,
        minimumStock: 5,
        updatedAt: new Date('2026-11-05T12:00:00Z'),
      },
    ]);
    const result = await service.preview(query({ kind: 'inventory' }), admin);
    expect(result.note).toContain('não representam um saldo histórico');
    expect(result.rows[0]).toContain('Repor estoque');
    expect(inventory.mock.calls[0][0]).not.toHaveProperty('where');
  });

  it('resume atividade profissional sem expor pacientes ou conteúdo clínico', async () => {
    appointments.mockResolvedValue([
      { ...appointment(), status: 'COMPLETED', durationMinutes: 50 },
      { ...appointment(), status: 'CANCELLED', durationMinutes: 50 },
    ]);
    const result = await service.preview(
      query({ kind: 'professionals' }),
      admin,
    );
    expect(result.rows).toEqual([
      ['Profissional demonstração', '2', '1', '1', '50'],
    ]);
    expect(result.note).toContain('Não mede ocupação');
  });

  it('resume fila e conversão de solicitações sem incluir dados dos pacientes', async () => {
    waitlist.mockResolvedValue([
      {
        status: 'scheduled',
        enteredAt: new Date('2026-11-01T12:00:00Z'),
        exitedAt: new Date('2026-11-03T12:00:00Z'),
      },
    ]);
    requests.mockResolvedValue([
      { status: 'APPROVED', generatedApptId: 'appointment-1' },
      { status: 'PENDING', generatedApptId: null },
    ]);
    const result = await service.preview(query({ kind: 'demand' }), admin);
    expect(result.metrics).toContainEqual({
      label: 'Solicitações com consulta gerada',
      value: '1',
    });
    expect(result.metrics).toContainEqual({
      label: 'Espera média até saída',
      value: '2,0 dias',
    });
    expect(result.rows).toContainEqual(['Fila de espera', 'Atendido', '1']);
  });

  it('resume cadastros recentes sem exportar identificação dos pacientes', async () => {
    patients.mockResolvedValue([
      { status: 'active' },
      { status: 'inactive' },
      { status: 'active' },
    ]);
    const result = await service.preview(query({ kind: 'patients' }), admin);
    expect(result.metrics).toContainEqual({
      label: 'Novos cadastros',
      value: '3',
    });
    expect(result.rows).toContainEqual(['Ativo', '2']);
  });

  it('agrega movimentações de estoque por item', async () => {
    stockMovements.mockResolvedValue([
      {
        itemId: 'item-1',
        movementType: 'ENTRY',
        quantity: 5,
        item: { name: 'Luvas' },
      },
      {
        itemId: 'item-1',
        movementType: 'EXIT',
        quantity: 2,
        item: { name: 'Luvas' },
      },
    ]);
    const result = await service.preview(
      query({ kind: 'stock-movements' }),
      admin,
    );
    expect(result.rows).toEqual([['Luvas', '5', '2', '2']]);
    expect(result.metrics).toContainEqual({
      label: 'Unidades retiradas',
      value: '2',
    });
  });

  it('resume avaliações por profissional sem comentários nem pacientes', async () => {
    reviews.mockResolvedValue([
      {
        doctorId: 'doctor-1',
        rating: 5,
        doctor: { user: { name: 'Profissional A' } },
      },
      {
        doctorId: 'doctor-1',
        rating: 3,
        doctor: { user: { name: 'Profissional A' } },
      },
    ]);
    const result = await service.preview(
      query({ kind: 'satisfaction' }),
      admin,
    );
    expect(result.rows).toEqual([['Profissional A', '2', '4,00']]);
    expect(result.columns).not.toContain('Comentário');
  });

  it('resume auditoria sem expor metadados, identificadores ou IP', async () => {
    audits.mockResolvedValue([
      { action: 'patient.read', resource: 'Patient', actorRole: 'ADMIN' },
      { action: 'patient.read', resource: 'Patient', actorRole: 'ADMIN' },
    ]);
    const result = await service.preview(query({ kind: 'audit' }), admin);
    expect(result.rows).toEqual([['Patient', 'patient.read', 'ADMIN', '2']]);
    expect(result.note).toContain('Não inclui identificadores');
  });

  it('limita apenas a prévia; CSV inclui registros após a linha 100', async () => {
    appointments.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) => ({
        ...appointment(),
        patient: { user: { name: `Paciente ${index + 1}` } },
      })),
    );
    const preview = await service.preview(query(), admin);
    expect(preview.rows).toHaveLength(100);
    expect(preview.totalRows).toBe(101);
    const exported = await service.export({ ...query(), format: 'csv' }, admin);
    expect(exported.buffer.toString('utf8')).toContain('Paciente 101');
    expect(exported.contentType).toBe('text/csv; charset=utf-8');
  });

  it('rejeita excesso de registros em vez de exportar parte deles', async () => {
    appointments.mockResolvedValue(Array.from({ length: 5001 }, appointment));
    await expect(service.preview(query(), admin)).rejects.toThrow(
      'excede 5.000',
    );
    await expect(
      service.export({ ...query(), format: 'csv' }, admin),
    ).rejects.toThrow('excede 5.000');
  });
});
