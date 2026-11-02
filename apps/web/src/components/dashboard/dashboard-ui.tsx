"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Alert } from "@/components/forms/form-field";
import { dashboardDateTime, type DashboardAppointment } from "./dashboard-data";

export const dashboardActionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-card-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function DashboardToolbar({
  loading,
  errors,
  onRefresh,
}: {
  loading: boolean;
  errors: Array<string | null>;
  onRefresh: () => void;
}) {
  const failures = errors.filter((error): error is string => !!error);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Agenda no horário de Brasília.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={onRefresh}
          className={`${dashboardActionClass} disabled:cursor-wait disabled:opacity-60`}
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-4 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Carregando dados" : "Atualizar painel"}
        </button>
      </div>
      {failures.length > 0 ? (
        <Alert kind="error">
          {failures.join(" ")} Use “Atualizar painel” para tentar novamente.
        </Alert>
      ) : null}
    </div>
  );
}

export function DashboardActions({
  actions,
}: {
  actions: Array<{
    label: string;
    href: string;
    icon: LucideIcon;
    primary?: boolean;
  }>;
}) {
  return (
    <nav aria-label="Atalhos do painel" className="flex flex-wrap gap-3">
      {actions.map(({ label, href, icon: Icon, primary }) => (
        <Link
          key={href}
          href={href}
          className={`${dashboardActionClass} ${primary ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function DashboardEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function DashboardLoading() {
  return (
    <p
      role="status"
      className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground"
    >
      Carregando…
    </p>
  );
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  WAITING: "Aguardando atendimento",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Remarcada",
};

export function DashboardAppointmentList({
  items,
  perspective,
  href,
}: {
  items: DashboardAppointment[];
  perspective: "reception" | "doctor" | "patient";
  href: string | ((item: DashboardAppointment) => string);
}) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:flex-row sm:items-center"
        >
          <div className="min-w-0 space-y-1">
            <p className="font-medium">
              {perspective === "patient"
                ? (item.doctor?.user.name ?? "Profissional")
                : (item.patient?.user.name ?? "Paciente")}
            </p>
            {perspective === "reception" ? (
              <p className="text-sm text-muted-foreground">
                Com {item.doctor?.user.name ?? "profissional"}
              </p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {dashboardDateTime(item.startDatetime)} ·{" "}
              {item.modality === "ONLINE" ? "Online" : "Presencial"}
            </p>
            <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground">
              {STATUS_LABEL[item.status] ?? item.status}
            </span>
          </div>
          <Link
            className={`${dashboardActionClass} shrink-0`}
            href={typeof href === "function" ? href(item) : href}
          >
            {perspective === "doctor" ? "Abrir atendimento" : "Ver consulta"}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
