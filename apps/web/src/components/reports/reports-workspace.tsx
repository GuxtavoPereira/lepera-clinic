"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  FileText,
  Info,
  LoaderCircle,
  Package,
  PackageOpen,
  Shield,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getToken, logout } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { DashboardHeader } from "@/components/dashboard/stat-card";
import { FormField, inputClassName } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";

type ReportKind =
  | "appointments"
  | "financial"
  | "inventory"
  | "professionals"
  | "demand"
  | "patients"
  | "stock-movements"
  | "satisfaction"
  | "audit";
type Report = {
  kind: ReportKind;
  title: string;
  period: { from: string; to: string };
  generatedAt: string;
  scopeLabel: string;
  note: string;
  columns: string[];
  rows: string[][];
  totalRows: number;
  previewLimit: number;
  metrics: { label: string; value: string }[];
};
const labels = {
  appointments: "Consultas",
  financial: "Financeiro",
  inventory: "Estoque atual",
  professionals: "Atividade profissional",
  demand: "Fila e solicitações",
  patients: "Novos pacientes",
  "stock-movements": "Movimentações de estoque",
  satisfaction: "Avaliações",
  audit: "Atividade operacional",
};
const icons = {
  appointments: CalendarDays,
  financial: Wallet,
  inventory: Package,
  professionals: BarChart3,
  demand: ClipboardList,
  patients: Users,
  "stock-movements": PackageOpen,
  satisfaction: Star,
  audit: Shield,
};
const descriptions: Record<ReportKind, string> = {
  appointments: "Agenda, situações, modalidades e cancelamentos.",
  financial: "Receitas, despesas, pendências e saldo do período.",
  inventory: "Posição atual e alertas de reposição do estoque.",
  professionals: "Volume de consultas e sessões realizadas por profissional.",
  demand: "Fila de espera, solicitações e tempo até a saída da fila.",
  patients: "Novos cadastros agrupados pela situação atual.",
  "stock-movements": "Entradas e saídas de materiais por item.",
  satisfaction: "Quantidade de avaliações e nota média por profissional.",
  audit: "Resumo das ações administrativas registradas no sistema.",
};
const reportGroups: {
  title: string;
  description: string;
  options: ReportKind[];
}[] = [
  {
    title: "Atendimento",
    description: "Agenda, procura e perfil dos cadastros",
    options: ["appointments", "professionals", "demand", "patients"],
  },
  {
    title: "Gestão da clínica",
    description: "Financeiro, materiais e atividades",
    options: ["financial", "inventory", "stock-movements", "audit"],
  },
  {
    title: "Experiência",
    description: "Percepção dos pacientes",
    options: ["satisfaction"],
  },
];
const PAGE_SIZE = 20;

type ChartItem = {
  label: string;
  value: number;
  displayValue: string;
  secondaryValue?: number;
  secondaryDisplayValue?: string;
};

type ReportChart = {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  items: ChartItem[];
};

function currentPeriod() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const year = Number(part("year"));
  const month = Number(part("month"));
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${new Date(Date.UTC(year, month, 0)).getUTCDate()}`,
  };
}

function dateLabel(value: string) {
  return value.split("-").reverse().join("/");
}

function message(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível emitir o relatório. Tente novamente.";
}

function currencyNumber(value: string) {
  const parsed = Number(
    value
      .replace(/[^\d,-]/g, "")
      .replace(".", "")
      .replace(",", "."),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function countNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildChart(report: Report): ReportChart {
  const rows = report.rows;
  const countBy = (index: number) => {
    const groups = new Map<string, number>();
    for (const row of rows) {
      const label = row[index] ?? "Não informado";
      groups.set(label, (groups.get(label) ?? 0) + 1);
    }
    return [...groups.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, 8)
      .map(([label, value]) => ({
        label,
        value,
        displayValue: String(value),
      }));
  };
  const countSeries = (
    title: string,
    description: string,
    primaryLabel: string,
    items: ChartItem[],
    secondaryLabel?: string,
  ): ReportChart => ({
    title,
    description,
    primaryLabel,
    secondaryLabel,
    items: items.slice(0, 8),
  });

  if (report.kind === "appointments") {
    return countSeries(
      "Consultas por situação",
      "Distribuição das linhas exibidas nesta prévia.",
      "Consultas",
      countBy(4),
    );
  }
  if (report.kind === "financial") {
    const groups = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      if (row[4] === "Cancelado") continue;
      const category = row[2] || "Sem categoria";
      const group = groups.get(category) ?? { income: 0, expense: 0 };
      if (row[3] === "Receita") group.income += currencyNumber(row[5] ?? "");
      else group.expense += currencyNumber(row[5] ?? "");
      groups.set(category, group);
    }
    const items = [...groups.entries()]
      .map(([label, values]) => ({
        label,
        value: values.income,
        displayValue: `R$ ${values.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        secondaryValue: values.expense,
        secondaryDisplayValue: `R$ ${values.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      }))
      .sort(
        (first, second) =>
          second.value +
          (second.secondaryValue ?? 0) -
          first.value -
          (first.secondaryValue ?? 0),
      );
    return countSeries(
      "Movimentação por categoria",
      "Valores não cancelados das linhas exibidas nesta prévia.",
      "Receitas",
      items,
      "Despesas",
    );
  }
  if (report.kind === "inventory") {
    return countSeries(
      "Quantidade atual por item",
      "Exibindo os itens com maior quantidade em estoque.",
      "Unidades",
      rows
        .map((row) => ({
          label: row[0],
          value: countNumber(row[1] ?? ""),
          displayValue: `${row[1]} un.`,
        }))
        .sort((first, second) => second.value - first.value),
    );
  }
  if (report.kind === "professionals") {
    return countSeries(
      "Atividade por profissional",
      "Comparação entre consultas e sessões realizadas nesta prévia.",
      "Consultas",
      rows
        .map((row) => ({
          label: row[0],
          value: countNumber(row[1] ?? ""),
          displayValue: row[1] ?? "0",
          secondaryValue: countNumber(row[2] ?? ""),
          secondaryDisplayValue: row[2] ?? "0",
        }))
        .sort((first, second) => second.value - first.value),
      "Realizadas",
    );
  }
  if (report.kind === "demand") {
    return countSeries(
      "Entradas por situação atual",
      "Solicitações e itens da fila criados no período.",
      "Registros",
      rows.map((row) => ({
        label: `${row[0]} · ${row[1]}`,
        value: countNumber(row[2] ?? ""),
        displayValue: row[2] ?? "0",
      })),
    );
  }
  if (report.kind === "patients") {
    return countSeries(
      "Novos pacientes por situação",
      "A situação corresponde ao cadastro no momento da emissão.",
      "Pacientes",
      rows.map((row) => ({
        label: row[0],
        value: countNumber(row[1] ?? ""),
        displayValue: row[1] ?? "0",
      })),
    );
  }
  if (report.kind === "stock-movements") {
    return countSeries(
      "Movimentação por item",
      "Comparação das unidades recebidas e retiradas no período.",
      "Recebidas",
      rows
        .map((row) => ({
          label: row[0],
          value: countNumber(row[1] ?? ""),
          displayValue: `${row[1]} un.`,
          secondaryValue: countNumber(row[2] ?? ""),
          secondaryDisplayValue: `${row[2]} un.`,
        }))
        .sort(
          (first, second) =>
            second.value +
            (second.secondaryValue ?? 0) -
            first.value -
            (first.secondaryValue ?? 0),
        ),
      "Retiradas",
    );
  }
  if (report.kind === "satisfaction") {
    return countSeries(
      "Nota média por profissional",
      "A escala vai de 1 a 5; a quantidade de avaliações aparece ao lado.",
      "Nota média",
      rows
        .map((row) => ({
          label: row[0],
          value: countNumber(row[2] ?? ""),
          displayValue: `${row[2]} / 5 · ${row[1]} avaliações`,
        }))
        .sort((first, second) => second.value - first.value),
    );
  }
  return countSeries(
    "Ações por tipo",
    "Distribuição agregada das ações registradas nesta prévia.",
    "Ações",
    rows
      .map((row) => ({
        label: `${row[0]} · ${row[1]}`,
        value: countNumber(row[3] ?? ""),
        displayValue: row[3] ?? "0",
      }))
      .sort((first, second) => second.value - first.value),
  );
}

function ReportVisualization({ report }: { report: Report }) {
  const chart = buildChart(report);
  const max = Math.max(
    1,
    ...chart.items.flatMap((item) =>
      item.secondaryValue === undefined
        ? [item.value]
        : [item.value, item.secondaryValue],
    ),
  );
  const ratingScale = report.kind === "satisfaction" ? 5 : max;
  const scale = Math.max(ratingScale, 1);

  return (
    <section
      className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6"
      aria-labelledby="report-chart-title"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="size-5" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-wide">
              Visão geral
            </p>
          </div>
          <h3 id="report-chart-title" className="mt-2 text-lg font-semibold">
            {chart.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {chart.description}
          </p>
        </div>
        {chart.items.length ? (
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-primary" />
              {chart.primaryLabel}
            </span>
            {chart.secondaryLabel ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                {chart.secondaryLabel}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {chart.items.length ? (
        <ol className="mt-6 space-y-4">
          {chart.items.map((item) => (
            <li
              key={item.label}
              className="grid gap-2 sm:grid-cols-[minmax(8rem,0.8fr)_minmax(0,2fr)] sm:items-center sm:gap-5"
            >
              <span className="truncate text-sm font-medium" title={item.label}>
                {item.label}
              </span>
              <div className="space-y-1.5">
                <div
                  role="img"
                  aria-label={`${item.label}: ${chart.primaryLabel} ${item.displayValue}${item.secondaryValue === undefined ? "" : `, ${chart.secondaryLabel} ${item.secondaryDisplayValue}`}`}
                >
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width: `${Math.min(100, (item.value / scale) * 100)}%`,
                      }}
                    />
                  </div>
                  {item.secondaryValue !== undefined ? (
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-emerald-500 transition-[width]"
                        style={{
                          width: `${Math.min(100, (item.secondaryValue / scale) * 100)}%`,
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3 pt-1 text-xs text-muted-foreground">
                    <span>
                      {chart.primaryLabel}: {item.displayValue}
                    </span>
                    {item.secondaryDisplayValue ? (
                      <span>
                        {chart.secondaryLabel}: {item.secondaryDisplayValue}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-6 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Ainda não há dados para montar esta visualização no período.
        </div>
      )}
      <p className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {report.kind === "inventory"
          ? "Estoque atual no momento da emissão; o período não altera esta posição."
          : "A visualização usa as linhas da prévia. Os indicadores e arquivos consideram o relatório completo."}
      </p>
    </section>
  );
}

async function downloadReport(report: Report, format: "pdf" | "csv") {
  const token = getToken();
  if (!token)
    throw new Error(
      "Sua sessão expirou. Entre novamente para emitir o relatório.",
    );
  const query = new URLSearchParams({
    kind: report.kind,
    ...report.period,
    format,
  });
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"}/api/reports/export?${query}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!response.ok) {
    if (response.status === 401) logout();
    const body: unknown = await response.json().catch(() => null);
    const detail =
      body && typeof body === "object" && "message" in body
        ? body.message
        : null;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.join(". ")
          : "Não foi possível baixar o relatório. Tente novamente.",
    );
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `leperapia-${report.kind}-${report.period.from}-${report.period.to}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function ReportsWorkspace() {
  const role = useRole();
  const [kind, setKind] = useState<ReportKind>("appointments");
  const [period, setPeriod] = useState(currentPeriod);
  const [report, setReport] = useState<Report | null>(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "csv" | null>(null);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const [status, setStatus] = useState("");
  const fromRef = useRef<HTMLInputElement>(null);
  const admin = role === "ADMIN" || role === "SUPER_ADMIN";
  const allowed: ReportKind[] = admin
    ? [
        "appointments",
        "financial",
        "inventory",
        "professionals",
        "demand",
        "patients",
        "stock-movements",
        "satisfaction",
        "audit",
      ]
    : ["appointments"];
  const busy = loading || downloading !== null;
  const pages = report
    ? Math.max(1, Math.ceil(report.rows.length / PAGE_SIZE))
    : 1;

  function invalidate() {
    setReport(null);
    setPage(0);
    setError("");
    setDateError("");
    setStatus("");
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!role || busy) return;
    setError("");
    setDateError("");
    setStatus("");
    const days =
      (Date.parse(`${period.to}T00:00:00Z`) -
        Date.parse(`${period.from}T00:00:00Z`)) /
      86_400_000;
    if (
      !Number.isFinite(days) ||
      days < 0 ||
      days >= 366 ||
      period.from < "1900-01-01"
    ) {
      setDateError(
        "Selecione datas válidas, em ordem, com até 366 dias no período.",
      );
      fromRef.current?.focus();
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const query = new URLSearchParams({
        kind: allowed.includes(kind) ? kind : "appointments",
        ...period,
      });
      const result = await apiFetch<Report>(`/reports?${query}`);
      setReport(result);
      setPage(0);
      setStatus(`Relatório gerado. ${result.totalRows} registros encontrados.`);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setLoading(false);
    }
  }

  async function exportFile(format: "pdf" | "csv") {
    if (!report || busy) return;
    setDownloading(format);
    setError("");
    setStatus("");
    try {
      await downloadReport(report, format);
      setStatus(`Download de ${format.toUpperCase()} iniciado.`);
    } catch (caught) {
      setError(message(caught));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <DashboardHeader
        title="Relatórios"
        subtitle="Consulte os resultados e baixe arquivos em PDF ou CSV para acompanhar a clínica."
      />
      <form
        onSubmit={generate}
        className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
        aria-busy={loading}
      >
        <fieldset disabled={busy || !role}>
          <div className="grid gap-7 xl:grid-cols-[minmax(0,1.6fr)_minmax(19rem,0.8fr)]">
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-semibold">
                  Escolha o que deseja acompanhar
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecione um relatório para ver os indicadores e a prévia.
                </p>
              </div>
              {reportGroups.map((group) => {
                const options = group.options.filter((option) =>
                  allowed.includes(option),
                );
                if (!options.length) return null;
                return (
                  <section key={group.title} aria-label={group.title}>
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold">{group.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {options.map((option) => {
                        const Icon = icons[option];
                        const selected = kind === option;
                        return (
                          <label
                            key={option}
                            className={`group relative flex min-h-28 cursor-pointer gap-3 rounded-xl border p-4 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:border-primary/40 hover:bg-muted/30"}`}
                          >
                            <input
                              type="radio"
                              name="report-kind"
                              value={option}
                              checked={selected}
                              onChange={() => {
                                invalidate();
                                setKind(option);
                              }}
                              className="sr-only"
                            />
                            <span
                              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-primary"}`}
                            >
                              <Icon className="size-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 pr-5">
                              <span className="block text-sm font-semibold text-foreground">
                                {labels[option]}
                              </span>
                              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                                {descriptions[option]}
                              </span>
                            </span>
                            {selected ? (
                              <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                              </span>
                            ) : null}
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
            <div className="flex flex-col gap-5 rounded-2xl bg-muted/40 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Configurar relatório
                </p>
                <h2 className="mt-1 text-lg font-semibold">{labels[kind]}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {descriptions[kind]}
                </p>
              </div>
              <div className="space-y-4">
                <FormField
                  id="report-from"
                  label="Data inicial"
                  error={dateError}
                >
                  <input
                    ref={fromRef}
                    id="report-from"
                    type="date"
                    min="1900-01-01"
                    max="9999-12-31"
                    required
                    value={period.from}
                    onChange={(event) => {
                      invalidate();
                      setPeriod({ ...period, from: event.target.value });
                    }}
                    className={inputClassName}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={
                      dateError ? "report-from-error" : undefined
                    }
                  />
                </FormField>
                <FormField id="report-to" label="Data final">
                  <input
                    id="report-to"
                    type="date"
                    min={period.from || "1900-01-01"}
                    max="9999-12-31"
                    required
                    value={period.to}
                    onChange={(event) => {
                      invalidate();
                      setPeriod({ ...period, to: event.target.value });
                    }}
                    className={inputClassName}
                    aria-invalid={Boolean(dateError)}
                    aria-describedby={
                      dateError ? "report-from-error" : undefined
                    }
                  />
                </FormField>
              </div>
              <div className="mt-auto space-y-3">
                <Button
                  type="submit"
                  className="min-h-11 w-full px-5"
                  disabled={busy || !role}
                >
                  {loading ? (
                    <LoaderCircle
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <FileText className="size-4" aria-hidden="true" />
                  )}
                  {loading ? "Gerando…" : "Gerar relatório"}
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Período inclusivo no horário de São Paulo. Até 366 dias e
                  5.000 registros.
                  {kind === "inventory"
                    ? " O estoque é uma posição atual e não muda com o período."
                    : ""}
                  {role === "PATIENT"
                    ? " Somente suas próprias consultas são incluídas."
                    : role === "DOCTOR"
                      ? " Somente suas consultas são incluídas."
                      : ""}
                </p>
              </div>
            </div>
          </div>
        </fieldset>
      </form>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      {report ? (
        <section className="space-y-5" aria-label="Resultado do relatório">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <h2 className="text-xl font-semibold">{report.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.scopeLabel}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {report.kind === "inventory"
                  ? "Posição atual"
                  : `${dateLabel(report.period.from)} a ${dateLabel(report.period.to)}`}{" "}
                · Emitido em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(report.generatedAt))}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void exportFile("pdf")}
                disabled={busy}
                className="min-h-11 px-4"
              >
                {downloading === "pdf" ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}{" "}
                Baixar PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void exportFile("csv")}
                disabled={busy}
                className="min-h-11 px-4"
              >
                {downloading === "csv" ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}{" "}
                Exportar CSV
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {report.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-xl border border-border bg-card p-4"
              >
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
          <ReportVisualization report={report} />
          <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            {report.note}
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
            <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
              {report.totalRows} registros no total.
              {report.totalRows > report.rows.length
                ? ` Prévia dos primeiros ${report.rows.length}; os arquivos incluem todos os ${report.totalRows} registros filtrados.`
                : " Os arquivos incluem todos os registros filtrados."}{" "}
              Os dados são consultados novamente ao baixar.
            </div>
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Tabela do relatório; role horizontalmente para ver todas as colunas"
            >
              <table className="w-full min-w-160 text-left text-sm">
                <caption className="sr-only">{report.title}</caption>
                <thead className="bg-muted/60">
                  <tr>
                    {report.columns.map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="px-4 py-3 font-semibold text-foreground"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {report.rows
                    .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
                    .map((row, index) => (
                      <tr key={page * PAGE_SIZE + index} className="align-top">
                        {row.map((cell, column) => (
                          <td
                            key={column}
                            className="max-w-72 break-words px-4 py-3"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  {report.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={report.columns.length}
                        className="px-4 py-12 text-center text-muted-foreground"
                      >
                        Nenhum registro encontrado. Altere o período ou o tipo
                        de relatório.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            {report.rows.length > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
                <p className="text-sm text-muted-foreground">
                  Prévia · página {page + 1} de {pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 px-4"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-11 px-4"
                    disabled={page + 1 >= pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : !loading ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <FileText
            className="mx-auto mb-3 size-8 text-primary"
            aria-hidden="true"
          />
          <p className="font-medium text-foreground">
            Seu relatório começa aqui
          </p>
          <p className="mt-1 text-sm">
            Escolha o tipo e o período e clique em Gerar relatório.
          </p>
        </div>
      ) : null}
    </div>
  );
}
