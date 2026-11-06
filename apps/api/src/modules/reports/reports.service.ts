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
import { REPORT_KINDS } from './dto/report-query.dto';
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
    if (!(REPORT_KINDS as readonly string[]).includes(query.kind)) {
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
    const nextDay = new Date(range.lte.getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    const dateTimeRange = {
      gte: clinicInstant(query.from),
      lt: clinicInstant(nextDay),
    };
    if (query.kind === 'appointments') {
      const where: Prisma.AppointmentWhereInput = {
        startDatetime: dateTimeRange,
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
    if (query.kind === 'professionals') {
      const entries = await this.prisma.db.appointment.findMany({
        where: { startDatetime: dateTimeRange },
        select: {
          doctorId: true,
          status: true,
          durationMinutes: true,
          doctor: { select: { user: { select: { name: true } } } },
        },
        orderBy: [{ doctorId: 'asc' }, { startDatetime: 'asc' }],
        take: MAX_REPORT_ROWS + 1,
      });
      this.checkLimit(entries.length);
      const grouped = new Map<
        string,
        {
          name: string;
          total: number;
          completed: number;
          cancelled: number;
          minutes: number;
        }
      >();
      for (const entry of entries) {
        const group = grouped.get(entry.doctorId) ?? {
          name: entry.doctor.user.name,
          total: 0,
          completed: 0,
          cancelled: 0,
          minutes: 0,
        };
        group.total += 1;
        if (entry.status === 'COMPLETED') {
          group.completed += 1;
          group.minutes += entry.durationMinutes;
        }
        if (entry.status === 'CANCELLED') group.cancelled += 1;
        grouped.set(entry.doctorId, group);
      }
      const rows = [...grouped.entries()]
        .map(([, group]) => group)
        .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
        .map((group) => [
          group.name,
          String(group.total),
          String(group.completed),
          String(group.cancelled),
          String(group.minutes),
        ]);
      return {
        ...base,
        title: 'Atividade dos profissionais',
        scopeLabel: 'Indicadores agregados da agenda da clínica',
        note: 'Mostra consultas registradas no período e minutos de sessões realizadas. Não mede ocupação da disponibilidade nem faltas, pois esses dados não são registrados como histórico.',
        columns: [
          'Profissional',
          'Consultas',
          'Realizadas',
          'Canceladas',
          'Minutos realizados',
        ],
        rows,
        totalRows: rows.length,
        metrics: [
          { label: 'Consultas no período', value: String(entries.length) },
          { label: 'Profissionais com agenda', value: String(grouped.size) },
          {
            label: 'Realizadas',
            value: String(
              entries.filter((entry) => entry.status === 'COMPLETED').length,
            ),
          },
        ],
      };
    }
    if (query.kind === 'demand') {
      const [waitlist, requests] = await Promise.all([
        this.prisma.db.waitlist.findMany({
          where: { enteredAt: dateTimeRange },
          select: { status: true, exitedAt: true, enteredAt: true },
          orderBy: [{ enteredAt: 'asc' }, { id: 'asc' }],
          take: MAX_REPORT_ROWS + 1,
        }),
        this.prisma.db.scheduleRequest.findMany({
          where: { createdAt: dateTimeRange },
          select: { status: true, generatedApptId: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: MAX_REPORT_ROWS + 1,
        }),
      ]);
      this.checkLimit(waitlist.length + requests.length);
      const counts = new Map<string, number>();
      const addCount = (label: string) =>
        counts.set(label, (counts.get(label) ?? 0) + 1);
      const waitlistLabels: Record<string, string> = {
        waiting: 'Aguardando',
        notified: 'Notificado',
        scheduled: 'Atendido',
        gave_up: 'Desistiu',
      };
      for (const entry of waitlist) {
        addCount(
          `Fila de espera|${waitlistLabels[entry.status] ?? entry.status}`,
        );
      }
      const requestLabels: Record<string, string> = {
        PENDING: 'Pendente',
        APPROVED: 'Aprovada',
        REJECTED: 'Recusada',
      };
      for (const entry of requests) {
        addCount(`Solicitações|${requestLabels[entry.status] ?? entry.status}`);
      }
      const completedWait = waitlist.filter((entry) => entry.exitedAt);
      const averageWaitDays = completedWait.length
        ? completedWait.reduce(
            (total, entry) =>
              total +
              (entry.exitedAt!.getTime() - entry.enteredAt.getTime()) /
                86_400_000,
            0,
          ) / completedWait.length
        : null;
      const rows = [...counts.entries()]
        .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
        .map(([key, count]) => [...key.split('|'), String(count)]);
      return {
        ...base,
        title: 'Fila de espera e solicitações',
        scopeLabel: 'Indicadores agregados de procura por atendimento',
        note: 'Os grupos referem-se a registros criados no período, apresentados com a situação atual. O tempo médio considera somente entradas da fila que já têm data de saída.',
        columns: ['Origem', 'Situação atual', 'Quantidade'],
        rows,
        totalRows: rows.length,
        metrics: [
          { label: 'Entradas na fila', value: String(waitlist.length) },
          { label: 'Solicitações recebidas', value: String(requests.length) },
          {
            label: 'Solicitações com consulta gerada',
            value: String(
              requests.filter((entry) => entry.generatedApptId).length,
            ),
          },
          {
            label: 'Espera média até saída',
            value:
              averageWaitDays === null
                ? 'Sem dados'
                : `${averageWaitDays.toFixed(1).replace('.', ',')} dias`,
          },
        ],
      };
    }
    if (query.kind === 'patients') {
      const entries = await this.prisma.db.patient.findMany({
        where: { user: { createdAt: dateTimeRange } },
        select: { status: true },
        take: MAX_REPORT_ROWS + 1,
      });
      this.checkLimit(entries.length);
      const counts = new Map<string, number>();
      const labels: Record<string, string> = {
        active: 'Ativo',
        inactive: 'Inativo',
        em_espera: 'Em espera',
      };
      for (const entry of entries) {
        const label = labels[entry.status] ?? entry.status;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      const rows = [...counts.entries()]
        .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
        .map(([status, count]) => [status, String(count)]);
      return {
        ...base,
        title: 'Novos pacientes',
        scopeLabel: 'Resumo agregado de cadastros da clínica',
        note: 'O período filtra a data de cadastro. A situação apresentada é a situação atual do cadastro, não um histórico de status.',
        columns: ['Situação atual', 'Quantidade'],
        rows,
        totalRows: rows.length,
        metrics: [
          { label: 'Novos cadastros', value: String(entries.length) },
          {
            label: 'Ativos entre os novos cadastros',
            value: String(
              entries.filter((entry) => entry.status === 'active').length,
            ),
          },
        ],
      };
    }
    if (query.kind === 'stock-movements') {
      const entries = await this.prisma.db.stockMovement.findMany({
        where: { createdAt: dateTimeRange },
        select: {
          itemId: true,
          movementType: true,
          quantity: true,
          item: { select: { name: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: MAX_REPORT_ROWS + 1,
      });
      this.checkLimit(entries.length);
      const grouped = new Map<
        string,
        { name: string; entries: number; exits: number; count: number }
      >();
      for (const entry of entries) {
        const group = grouped.get(entry.itemId) ?? {
          name: entry.item.name,
          entries: 0,
          exits: 0,
          count: 0,
        };
        if (entry.movementType === 'ENTRY') group.entries += entry.quantity;
        else group.exits += entry.quantity;
        group.count += 1;
        grouped.set(entry.itemId, group);
      }
      const rows = [...grouped.entries()]
        .map(([, group]) => group)
        .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
        .map((group) => [
          group.name,
          String(group.entries),
          String(group.exits),
          String(group.count),
        ]);
      return {
        ...base,
        title: 'Movimentações de estoque',
        scopeLabel: 'Movimentações registradas no período',
        note: 'Totais de entradas e saídas por item. Não representam custo financeiro ou posição histórica do estoque.',
        columns: [
          'Item',
          'Unidades recebidas',
          'Unidades retiradas',
          'Movimentações',
        ],
        rows,
        totalRows: rows.length,
        metrics: [
          { label: 'Movimentações', value: String(entries.length) },
          {
            label: 'Unidades recebidas',
            value: String(
              entries
                .filter((entry) => entry.movementType === 'ENTRY')
                .reduce((sum, entry) => sum + entry.quantity, 0),
            ),
          },
          {
            label: 'Unidades retiradas',
            value: String(
              entries
                .filter((entry) => entry.movementType === 'EXIT')
                .reduce((sum, entry) => sum + entry.quantity, 0),
            ),
          },
        ],
      };
    }
    if (query.kind === 'satisfaction') {
      const entries = await this.prisma.db.review.findMany({
        where: { createdAt: dateTimeRange },
        select: {
          doctorId: true,
          rating: true,
          doctor: { select: { user: { select: { name: true } } } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: MAX_REPORT_ROWS + 1,
      });
      this.checkLimit(entries.length);
      const grouped = new Map<
        string,
        { name: string; total: number; score: number }
      >();
      for (const entry of entries) {
        const group = grouped.get(entry.doctorId) ?? {
          name: entry.doctor.user.name,
          total: 0,
          score: 0,
        };
        group.total += 1;
        group.score += entry.rating;
        grouped.set(entry.doctorId, group);
      }
      const rows = [...grouped.entries()]
        .map(([, group]) => group)
        .sort((first, second) => first.name.localeCompare(second.name, 'pt-BR'))
        .map((group) => [
          group.name,
          String(group.total),
          (group.score / group.total).toFixed(2).replace('.', ','),
        ]);
      const score =
        entries.reduce((sum, entry) => sum + entry.rating, 0) /
        (entries.length || 1);
      return {
        ...base,
        title: 'Avaliações dos pacientes',
        scopeLabel: 'Resumo agregado de avaliações por profissional',
        note: 'Inclui apenas quantidade e notas. Comentários e identificação dos pacientes não são exportados.',
        columns: ['Profissional', 'Avaliações', 'Nota média (1 a 5)'],
        rows,
        totalRows: rows.length,
        metrics: [
          { label: 'Avaliações recebidas', value: String(entries.length) },
          {
            label: 'Nota média geral',
            value: entries.length
              ? score.toFixed(2).replace('.', ',')
              : 'Sem dados',
          },
        ],
      };
    }
    if (query.kind === 'audit') {
      const entries = await this.prisma.db.auditLog.findMany({
        where: { createdAt: dateTimeRange },
        select: { action: true, resource: true, actorRole: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: MAX_REPORT_ROWS + 1,
      });
      this.checkLimit(entries.length);
      const grouped = new Map<string, number>();
      for (const entry of entries) {
        const key = `${entry.resource}|${entry.action}|${entry.actorRole ?? 'Não informado'}`;
        grouped.set(key, (grouped.get(key) ?? 0) + 1);
      }
      const rows = [...grouped.entries()]
        .sort(([first], [second]) => first.localeCompare(second, 'pt-BR'))
        .map(([key, count]) => [...key.split('|'), String(count)]);
      return {
        ...base,
        title: 'Atividade operacional',
        scopeLabel: 'Resumo agregado da trilha de auditoria',
        note: 'Exibe somente tipo de ação, recurso e papel. Não inclui identificadores, endereços IP, metadados ou conteúdo clínico.',
        columns: ['Recurso', 'Ação', 'Papel', 'Quantidade'],
        rows,
        totalRows: rows.length,
        metrics: [
          { label: 'Ações registradas', value: String(entries.length) },
          { label: 'Tipos de atividade', value: String(rows.length) },
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
