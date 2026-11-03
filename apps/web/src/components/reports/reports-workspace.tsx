"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Download,
  FileText,
  LoaderCircle,
  Package,
  Wallet,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getToken, logout } from "@/lib/auth";
import { useRole } from "@/lib/use-role";
import { DashboardHeader } from "@/components/dashboard/stat-card";
import { FormField, inputClassName } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";

type ReportKind = "appointments" | "financial" | "inventory";
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
};
const icons = {
  appointments: CalendarDays,
  financial: Wallet,
  inventory: Package,
};
const PAGE_SIZE = 20;

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
    ? ["appointments", "financial", "inventory"]
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
        className="space-y-5 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-6"
        aria-busy={loading}
      >
        <fieldset disabled={busy || !role} className="space-y-5">
          <legend className="mb-3 text-sm font-semibold">
            O que você quer consultar?
          </legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {allowed.map((option) => {
              const Icon = icons[option];
              return (
                <label
                  key={option}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition has-focus-visible:ring-2 has-focus-visible:ring-ring ${kind === option ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
                >
                  <input
                    type="radio"
                    name="report-kind"
                    value={option}
                    checked={kind === option}
                    onChange={() => {
                      invalidate();
                      setKind(option);
                    }}
                    className="accent-primary"
                  />
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="text-sm font-medium">{labels[option]}</span>
                </label>
              );
            })}
          </div>
          {kind === "inventory" ? (
            <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              O estoque mostra a posição atual no momento da emissão. O período
              não altera as quantidades.
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <FormField id="report-from" label="Data inicial" error={dateError}>
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
                aria-describedby={dateError ? "report-from-error" : undefined}
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
                aria-describedby={dateError ? "report-from-error" : undefined}
              />
            </FormField>
            <Button
              type="submit"
              className="min-h-11 px-5"
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
          </div>
          <p className="text-xs text-muted-foreground">
            Período inclusivo, no horário de São Paulo. Até 366 dias e 5.000
            registros por relatório.
            {role === "PATIENT"
              ? " Somente suas próprias consultas são incluídas."
              : role === "DOCTOR"
                ? " Somente suas consultas são incluídas."
                : ""}
          </p>
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
