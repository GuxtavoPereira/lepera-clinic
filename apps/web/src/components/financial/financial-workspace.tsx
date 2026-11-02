"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Download,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";
import type {
  FinancialDisplayStatus,
  FinancialEntry,
  FinancialPage,
  FinancialSummary,
  FinancialType,
} from "@lepera/contracts";
import { apiFetch } from "@/lib/api-client";
import { useRole } from "@/lib/use-role";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName } from "@/components/forms/form-field";
import { DashboardHeader, StatCard } from "@/components/dashboard/stat-card";
import { FinancialEntrySheet } from "./financial-entry-sheet";
import { FinancialActionSheet } from "./financial-action-sheet";
import {
  civilDate,
  financialCsv,
  money,
  monthRange,
  statusLabels,
} from "./financial-utils";
import { useFinancialResource } from "./use-financial-resource";

type Filters = {
  from: string;
  to: string;
  type: "" | FinancialType;
  status: "" | FinancialDisplayStatus;
  search: string;
};
const statusStyle = {
  PENDING: "bg-amber-500/10 text-amber-900 dark:text-amber-200",
  OVERDUE: "bg-red-500/10 text-red-800 dark:text-red-300",
  PAID: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  CANCELLED: "bg-muted text-muted-foreground",
};

function filterParams(filters: Filters) {
  const params = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.search) params.set("search", filters.search);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  return params;
}

export function FinancialWorkspace({
  reception = false,
}: {
  reception?: boolean;
}) {
  const role = useRole();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const canExpense = isAdmin && !reception;
  const [filters, setFilters] = useState<Filters>(() => ({
    ...monthRange(),
    type: reception ? "INCOME" : "",
    status: "",
    search: "",
  }));
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editor, setEditor] = useState<{ entry: FinancialEntry | null } | null>(
    null,
  );
  const [selected, setSelected] = useState<FinancialEntry | null>(null);
  const params = filterParams(filters);
  const summaryPath = `/financial/summary?${params}#${version}`;
  params.set("page", String(page));
  params.set("pageSize", "20");
  const list = useFinancialResource<FinancialPage<FinancialEntry>>(
    `/financial?${params}#${version}`,
    !!role,
  );
  const summary = useFinancialResource<FinancialSummary>(summaryPath, !!role);
  const loading = list.loading || summary.loading;

  function refresh() {
    setVersion((n) => n + 1);
  }
  function apply(event: FormEvent) {
    event.preventDefault();
    const from = new Date(`${draft.from}T00:00:00Z`);
    const to = new Date(`${draft.to}T00:00:00Z`);
    const days = (to.getTime() - from.getTime()) / 86400000;
    if (
      !draft.from ||
      !draft.to ||
      !Number.isFinite(days) ||
      draft.from < "1900-01-01" ||
      draft.to < draft.from ||
      days >= 366
    ) {
      setFilterError("Informe um período válido de até 366 dias.");
      return;
    }
    setFilterError(null);
    setPage(1);
    setFilters({ ...draft, search: draft.search.trim() });
    setExportError(null);
    refresh();
  }
  function preset(offset: number) {
    const next = { ...filters, ...monthRange(offset) };
    setFilters(next);
    setDraft(next);
    setPage(1);
    setFilterError(null);
    setExportError(null);
  }
  function saved(message: string) {
    setEditor(null);
    setSelected(null);
    setNotice(message);
    refresh();
  }
  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const result = await apiFetch<{ items: FinancialEntry[] }>(
        `/financial/export?${filterParams(filters)}`,
      );
      const url = URL.createObjectURL(
        new Blob([financialCsv(result.items)], {
          type: "text/csv;charset=utf-8;",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `leperapia-financeiro-${filters.from}-${filters.to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setExportError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível exportar os dados.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <DashboardHeader
          title={reception ? "Cobranças e recebimentos" : "Financeiro"}
          subtitle={
            reception
              ? "Acompanhe as cobranças das consultas e registre os recebimentos."
              : "Controle as receitas, despesas e pendências da clínica."
          }
        />
        <Button
          type="button"
          onClick={() => {
            setNotice(null);
            setEditor({ entry: null });
          }}
        >
          <Plus aria-hidden="true" className="size-4" />
          {reception ? "Nova cobrança" : "Novo lançamento"}
        </Button>
      </div>
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-900 dark:text-emerald-200"
        >
          {notice} Os resultados seguem o período e os filtros selecionados.
        </p>
      ) : null}
      <section
        aria-label="Filtros financeiros"
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Período por vencimento</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => preset(0)}
            >
              Este mês
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => preset(-1)}
            >
              Mês anterior
            </Button>
          </div>
        </div>
        <form onSubmit={apply} className="space-y-4">
          <div
            className={`grid gap-3 sm:grid-cols-2 ${canExpense ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}
          >
            <FormField id="financial-from" label="Vencimento a partir de">
              <input
                id="financial-from"
                type="date"
                min="1900-01-01"
                required
                value={draft.from}
                onChange={(e) => setDraft({ ...draft, from: e.target.value })}
                className={inputClassName}
              />
            </FormField>
            <FormField id="financial-to" label="Vencimento até">
              <input
                id="financial-to"
                type="date"
                min={draft.from || "1900-01-01"}
                required
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                className={inputClassName}
              />
            </FormField>
            {canExpense ? (
              <FormField id="financial-filter-type" label="Tipo">
                <select
                  id="financial-filter-type"
                  className={inputClassName}
                  value={draft.type}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      type: e.target.value as Filters["type"],
                    })
                  }
                >
                  <option value="">Receitas e despesas</option>
                  <option value="INCOME">Receitas</option>
                  <option value="EXPENSE">Despesas</option>
                </select>
              </FormField>
            ) : null}
            <FormField id="financial-status" label="Situação">
              <select
                id="financial-status"
                className={inputClassName}
                value={draft.status}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    status: e.target.value as Filters["status"],
                  })
                }
              >
                <option value="">Todas as situações</option>
                <option value="PENDING">Pendentes (inclui atrasadas)</option>
                <option value="OVERDUE">Em atraso</option>
                <option value="PAID">Quitadas</option>
                <option value="CANCELLED">Canceladas</option>
              </select>
            </FormField>
            <FormField id="financial-search" label="Buscar lançamento">
              <input
                id="financial-search"
                className={inputClassName}
                placeholder="Descrição, categoria ou paciente"
                maxLength={120}
                value={draft.search}
                onChange={(e) => setDraft({ ...draft, search: e.target.value })}
              />
            </FormField>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">Aplicar filtros</Button>
            <p className="text-xs text-muted-foreground">
              De {civilDate(filters.from)} a {civilDate(filters.to)} · Até 366
              dias
            </p>
          </div>
          {filterError ? (
            <p role="alert" className="text-sm text-destructive">
              {filterError}
            </p>
          ) : null}
        </form>
      </section>
      <section aria-label="Resumo financeiro dos filtros" className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Indicadores dos filtros aplicados. Pendências incluem atrasos. Saldo =
          receitas quitadas − despesas quitadas com vencimento no período; não
          representa o saldo bancário.
        </p>
        {summary.error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 p-4 text-sm text-destructive"
          >
            {summary.error}
          </p>
        ) : null}
        {summary.data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Receitas recebidas"
              value={money(summary.data.incomePaid)}
              icon={ArrowDownLeft}
              hint="Quitadas no conjunto filtrado"
            />
            <StatCard
              label="A receber"
              value={money(summary.data.incomePending)}
              icon={Clock}
              hint={`Em atraso: ${money(summary.data.incomeOverdue)}`}
              tone={
                Number(summary.data.incomeOverdue) > 0 ? "warning" : "default"
              }
            />
            {canExpense ? (
              <>
                <StatCard
                  label="Despesas pagas"
                  value={money(summary.data.expensePaid)}
                  icon={ArrowUpRight}
                />
                <StatCard
                  label="A pagar"
                  value={money(summary.data.expensePending)}
                  icon={Clock}
                  hint={`Em atraso: ${money(summary.data.expenseOverdue)}`}
                  tone={
                    Number(summary.data.expenseOverdue) > 0
                      ? "warning"
                      : "default"
                  }
                />
                <StatCard
                  label="Saldo dos lançamentos quitados"
                  value={money(summary.data.balance)}
                  icon={Wallet}
                />
              </>
            ) : null}
            <StatCard
              label="Lançamentos"
              value={summary.data.totalCount}
              icon={Wallet}
              hint="Todos os resultados dos filtros"
            />
          </div>
        ) : summary.loading ? (
          <p
            role="status"
            className="rounded-xl border border-border bg-card p-5 text-muted-foreground"
          >
            Carregando resumo…
          </p>
        ) : null}
      </section>
      <section
        className="overflow-hidden rounded-2xl border border-border bg-card"
        aria-label="Lançamentos financeiros"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <h2 className="font-semibold">
            {reception ? "Cobranças" : "Lançamentos"}
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={refresh}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Atualizar
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading || exporting || !list.data?.total}
              onClick={() => void exportCsv()}
            >
              <Download aria-hidden="true" className="size-4" />
              {exporting ? "Exportando…" : "Exportar CSV"}
            </Button>
          </div>
        </div>
        {exportError ? (
          <p role="alert" className="m-5 text-sm text-destructive">
            {exportError}
          </p>
        ) : null}
        {list.error ? (
          <div role="alert" className="space-y-3 p-5 text-sm text-destructive">
            <p>{list.error}</p>
            <Button type="button" variant="outline" onClick={refresh}>
              Tentar novamente
            </Button>
          </div>
        ) : null}
        {list.loading ? (
          <p role="status" className="p-6 text-muted-foreground">
            Carregando lançamentos…
          </p>
        ) : null}
        {list.data?.items.length === 0 ? (
          <div className="space-y-2 p-8 text-center">
            <Wallet
              aria-hidden="true"
              className="mx-auto size-8 text-muted-foreground"
            />
            <h3 className="font-medium">Nenhum lançamento encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Ajuste o período ou cadastre uma nova pendência.
            </p>
          </div>
        ) : null}
        {list.data && list.data.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <caption className="sr-only">
                  Lançamentos com vencimento entre {civilDate(filters.from)} e{" "}
                  {civilDate(filters.to)}
                </caption>
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    {[
                      "Descrição / paciente",
                      "Tipo",
                      "Vencimento",
                      "Valor",
                      "Situação",
                      "Ações",
                    ].map((label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-5 py-3 font-medium"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.data.items.map((entry) => (
                    <tr
                      key={entry.id}
                      className="transition hover:bg-accent/40"
                    >
                      <td className="max-w-72 px-5 py-4">
                        <p className="break-words font-medium">
                          {entry.description}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {entry.category}
                          {entry.appointment
                            ? ` · ${entry.appointment.patientName}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {entry.type === "INCOME" ? "Receita" : "Despesa"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 tabular-nums">
                        {civilDate(entry.dueDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-medium tabular-nums">
                        {money(entry.amount)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${statusStyle[entry.displayStatus]}`}
                        >
                          {statusLabels[entry.displayStatus]}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Abrir lançamento: ${entry.description}`}
                          onClick={() => setSelected(entry)}
                        >
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5 text-sm text-muted-foreground">
              <p>
                {list.data.total} lançamento(s) · Página {list.data.page} de{" "}
                {list.data.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={page >= list.data.totalPages}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </section>
      <p className="text-xs text-muted-foreground">
        Registro manual de pagamentos integrais. Não realiza cobranças
        bancárias, emissão de nota fiscal ou devoluções automáticas.
      </p>
      {editor ? (
        <FinancialEntrySheet
          key={editor.entry?.id ?? "new"}
          initial={editor.entry}
          canExpense={canExpense}
          onClose={() => setEditor(null)}
          onSaved={(entry) => saved(`Lançamento “${entry.description}” salvo.`)}
        />
      ) : null}
      {selected ? (
        <FinancialActionSheet
          key={selected.id}
          entry={selected}
          isAdmin={isAdmin}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEditor({ entry: selected });
            setSelected(null);
          }}
          onSaved={saved}
        />
      ) : null}
    </div>
  );
}
