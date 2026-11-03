import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { clinicInstant } from '../appointments/calendar-time';
import { financialRange, financialToday } from '../financial/financial.utils';
import type {
  ExportReportQueryDto,
  ReportQueryDto,
} from './dto/report-query.dto';
import { reportCsv, reportPdf } from './report-export';
import {
  MAX_REPORT_ROWS,
  REPORT_PREVIEW_ROWS,
  type OperationalReport,
  type ReportPreview,
} from './report.types';

const appointmentSelect = {
  startDatetime: true,
  endDatetime: true,
  status: true,
  type: true,
  modality: true,
  patient: { select: { user: { select: { name: true } } } },
  doctor: { select: { user: { select: { name: true } } } },
} satisfies Prisma.AppointmentSelect;

const appointmentStatuses: Record<string, string> = {
  SCHEDULED: 'Agendada',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Realizada',
  CANCELLED: 'Cancelada',
  RESCHEDULED: 'Remarcada',
  WAITING: 'Em espera',
};
const appointmentTypes: Record<string, string> = {
  SESSION: 'Sessão',
  EVALUATION: 'Avaliação',
  RETURN: 'Retorno',
  CLOSURE: 'Encerramento',
};
const paymentMethods: Record<string, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  DEBIT_CARD: 'Débito',
  CREDIT_CARD: 'Crédito',
  BANK_TRANSFER: 'Transferência',
  INSURANCE: 'Convênio',
  OTHER: 'Outro',
};
const dateTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function reportMoney(amount: Prisma.Decimal): string {
  const [integer, cents] = amount.toFixed(2).split('.');
  return `R$ ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${cents}`;
}

function civilLabel(date: Date): string {
  return date.toISOString().slice(0, 10).split('-').reverse().join('/');
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(
    query: ReportQueryDto,
    actor: AuthUser,
  ): Promise<ReportPreview> {
    const report = await this.build(query, actor);
    return {
      ...report,
      rows: report.rows.slice(0, REPORT_PREVIEW_ROWS),
      previewLimit: REPORT_PREVIEW_ROWS,
    };
  }

  async export(query: ExportReportQueryDto, actor: AuthUser) {
    const report = await this.build(query, actor);
    if (query.format !== 'pdf' && query.format !== 'csv') {
      throw new BadRequestException('Escolha PDF ou CSV para exportar');
    }
    const buffer =
      query.format === 'pdf' ? await reportPdf(report) : reportCsv(report);
    return {
      buffer,
      contentType:
        query.format === 'pdf' ? 'application/pdf' : 'text/csv; charset=utf-8',
      filename: `leperapia-${query.kind}-${query.from}-${query.to}.${query.format}`,
    };
  }

  private checkLimit(length: number) {
    if (length > MAX_REPORT_ROWS) {
      throw new BadRequestException(
        'O relatório excede 5.000 registros. Reduza o período; nenhum dado foi exportado.',
      );
    }
  }

  private async build(
    query: ReportQueryDto,
    actor: AuthUser,
  ): Promise<OperationalReport> {
    if (
      !['ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT'].includes(
        actor.role,
      )
    ) {
      throw new ForbiddenException('Você não pode emitir relatórios');
    }
    if (!['appointments', 'financial', 'inventory'].includes(query.kind)) {
      throw new BadRequestException('Selecione um tipo de relatório válido');
    }
    if (
      query.kind !== 'appointments' &&
      !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Este relatório é exclusivo da administração',
      );
    }
    const range = financialRange(query.from, query.to);
    const base = {
      kind: query.kind,
      period: { from: query.from, to: query.to },
      generatedAt: new Date().toISOString(),
    };
    if (query.kind === 'appointments') {
      const nextDay = new Date(range.lte.getTime() + 86_400_000)
        .toISOString()
        .slice(0, 10);
      const where: Prisma.AppointmentWhereInput = {
        startDatetime: {
          gte: clinicInstant(query.from),
          lt: clinicInstant(nextDay),
        },
      };
      let scopeLabel = 'Consultas da clínica';
      if (actor.role === 'DOCTOR') {
        const doctor = await this.prisma.db.doctor.findUnique({
          where: { userId: actor.sub },
          select: { id: true },
        });
        if (!doctor)
          throw new NotFoundException('Perfil de profissional não encontrado');
        where.doctorId = doctor.id;
        scopeLabel = 'Somente as consultas do profissional autenticado';
      } else if (actor.role === 'PATIENT') {
        const patient = await this.prisma.db.patient.findUnique({
          where: { userId: actor.sub },
          select: { id: true },
        });
        if (!patient)
          throw new NotFoundException('Perfil de paciente não encontrado');
        where.patientId = patient.id;
        scopeLabel = 'Somente as consultas do paciente autenticado';
      }
      const entries = await this.prisma.db.appointment.findMany({
        where,
        select: appointmentSelect,
        orderBy: [{ startDatetime: 'asc' }, { id: 'asc' }],
        take: MAX_REPORT_ROWS + 1,
      });
      this.checkLimit(entries.length);
      return {
        ...base,
        title: 'Relatório de consultas',
        scopeLabel,
        note: 'Horários no fuso de São Paulo. Relatório de agenda sem conteúdo de prontuário.',
        columns: [
          'Início',
          'Fim',
          'Paciente',
          'Profissional',
          'Situação',
          'Tipo',
          'Modalidade',
        ],
        rows: entries.map((entry) => [
          dateTime.format(entry.startDatetime),
          dateTime.format(entry.endDatetime),
          entry.patient.user.name,
          entry.doctor.user.name,
          appointmentStatuses[entry.status] ?? entry.status,
          appointmentTypes[entry.type] ?? entry.type,
          entry.modality === 'ONLINE' ? 'Online' : 'Presencial',
        ]),
        totalRows: entries.length,
        metrics: [
          { label: 'Consultas', value: String(entries.length) },
          {
            label: 'Realizadas',
            value: String(
              entries.filter((entry) => entry.status === 'COMPLETED').length,
            ),
          },
          {
            label: 'Agendadas / confirmadas',
            value: String(
              entries.filter((entry) =>
                ['SCHEDULED', 'CONFIRMED', 'WAITING'].includes(entry.status),
              ).length,
            ),
          },
          {
            label: 'Canceladas',
            value: String(
              entries.filter((entry) => entry.status === 'CANCELLED').length,
            ),
          },
        ],
      };
    }
    if (query.kind === 'financial') {
      const entries = await this.prisma.db.financialTransaction.findMany({
        where: { dueDate: range },
        select: {
          dueDate: true,
          paidAt: true,
          type: true,
          status: true,
          amount: true,
          description: true,
          category: true,
          paymentMethod: true,
        },
        orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
        take: MAX_REPORT_ROWS + 1,
      });
      this.checkLimit(entries.length);
      let income = new Prisma.Decimal(0);
      let expenses = new Prisma.Decimal(0);
      let pendingIncome = new Prisma.Decimal(0);
      let pendingExpenses = new Prisma.Decimal(0);
      for (const entry of entries) {
        if (entry.status === 'PAID') {
          if (entry.type === 'INCOME') income = income.plus(entry.amount);
          else expenses = expenses.plus(entry.amount);
        } else if (entry.status === 'PENDING') {
          if (entry.type === 'INCOME')
            pendingIncome = pendingIncome.plus(entry.amount);
          else pendingExpenses = pendingExpenses.plus(entry.amount);
        }
      }
      const today = financialToday();
      return {
        ...base,
        title: 'Relatório financeiro',
        scopeLabel: 'Gestão financeira da clínica',
        note: 'Filtrado pelo vencimento. Cancelados não entram nos totais. Saldo = receitas baixadas menos despesas baixadas do período; não é saldo bancário ou documento fiscal.',
        columns: [
          'Vencimento',
          'Descrição',
          'Categoria',
          'Tipo',
          'Situação',
          'Valor',
          'Baixa',
          'Forma',
        ],
        rows: entries.map((entry) => [
          civilLabel(entry.dueDate),
          entry.description,
          entry.category,
          entry.type === 'INCOME' ? 'Receita' : 'Despesa',
          entry.status === 'PAID'
            ? 'Baixado'
            : entry.status === 'CANCELLED'
              ? 'Cancelado'
              : entry.dueDate.toISOString().slice(0, 10) < today
                ? 'Em atraso'
                : 'Pendente',
          reportMoney(entry.amount),
          entry.paidAt ? civilLabel(entry.paidAt) : '—',
          entry.paymentMethod ? paymentMethods[entry.paymentMethod] : '—',
        ]),
        totalRows: entries.length,
        metrics: [
          { label: 'Receitas baixadas', value: reportMoney(income) },
          { label: 'Despesas baixadas', value: reportMoney(expenses) },
          {
            label: 'Saldo do período',
            value: reportMoney(income.minus(expenses)),
          },
          { label: 'A receber', value: reportMoney(pendingIncome) },
          { label: 'A pagar', value: reportMoney(pendingExpenses) },
        ],
      };
    }
    const entries = await this.prisma.db.inventoryItem.findMany({
      select: {
        name: true,
        stockQuantity: true,
        minimumStock: true,
        updatedAt: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: MAX_REPORT_ROWS + 1,
    });
    this.checkLimit(entries.length);
    return {
      ...base,
      title: 'Posição atual do estoque',
      scopeLabel: 'Estoque da clínica no momento da emissão',
      note: 'Este relatório mostra quantidades atuais. As datas selecionadas não filtram esta posição e não representam um saldo histórico.',
      columns: [
        'Item',
        'Quantidade atual',
        'Estoque mínimo',
        'Situação',
        'Última atualização',
      ],
      rows: entries.map((entry) => [
        entry.name,
        String(entry.stockQuantity),
        String(entry.minimumStock),
        entry.stockQuantity <= entry.minimumStock ? 'Repor estoque' : 'Regular',
        dateTime.format(entry.updatedAt),
      ]),
      totalRows: entries.length,
      metrics: [
        { label: 'Itens cadastrados', value: String(entries.length) },
        {
          label: 'Precisam de reposição',
          value: String(
            entries.filter((entry) => entry.stockQuantity <= entry.minimumStock)
              .length,
          ),
        },
        {
          label: 'Sem estoque',
          value: String(
            entries.filter((entry) => entry.stockQuantity === 0).length,
          ),
        },
      ],
    };
  }
}
