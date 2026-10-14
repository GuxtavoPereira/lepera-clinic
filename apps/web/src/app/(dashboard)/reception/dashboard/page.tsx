"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarCheck,
  CalendarPlus,
  FileText,
  UserPlus,
  Users,
} from "lucide-react";
import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/stat-card";
import { Alert } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type Appointment = {
  id: string;
  startDatetime: string;
  status: string;
  patient: { user: { name: string } };
  doctor: { user: { name: string } };
};

type Summary = {
  todayCount: number;
  next: Appointment[];
  scheduleRequests: number;
  cancellationRequests: number;
  patients: number;
};

export default function ReceptionDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<{ items: Appointment[] }>(
        "/appointments?scope=upcoming&pageSize=50",
      ),
      apiFetch<unknown[]>("/schedule-requests/pending"),
      apiFetch<unknown[]>("/cancellation-requests/pending"),
      apiFetch<{ total: number }>("/patients?pageSize=1"),
    ])
      .then(([appointments, scheduleRequests, cancellations, patients]) => {
        if (!active) return;
        const todayKey = new Date().toLocaleDateString("pt-BR");
        const open = appointments.items.filter(
          (item) => item.status !== "CANCELLED",
        );
        setSummary({
          todayCount: open.filter(
            (item) =>
              new Date(item.startDatetime).toLocaleDateString("pt-BR") ===
              todayKey,
          ).length,
          next: open.slice(0, 5),
          scheduleRequests: scheduleRequests.length,
          cancellationRequests: cancellations.length,
          patients: patients.total,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o painel.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardHeader
        title="Recepção"
        subtitle="Pendências do dia e atalhos de atendimento."
      />

      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Solicitações de agendamento"
          value={summary?.scheduleRequests ?? "—"}
          hint="Aguardando análise"
          icon={FileText}
          href="/reception/requests"
          tone={summary && summary.scheduleRequests > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Pedidos de cancelamento"
          value={summary?.cancellationRequests ?? "—"}
          hint="Dos profissionais"
          icon={Ban}
          href="/reception/appointments"
          tone={
            summary && summary.cancellationRequests > 0 ? "warning" : "default"
          }
        />
        <StatCard
          label="Consultas hoje"
          value={summary?.todayCount ?? "—"}
          icon={CalendarCheck}
          href="/reception/appointments"
        />
        <StatCard
          label="Pacientes cadastrados"
          value={summary?.patients ?? "—"}
          icon={Users}
          href="/reception/patients"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/reception/appointments/new"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
        >
          <CalendarPlus className="size-4" />
          Novo agendamento
        </Link>
        <Link
          href="/reception/patients"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
        >
          <UserPlus className="size-4" />
          Cadastrar paciente
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Próximas consultas
        </h2>
        {!summary ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : summary.next.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            Nenhuma consulta futura na agenda.
          </p>
        ) : (
          <ul className="space-y-2">
            {summary.next.map((appointment) => (
              <li
                key={appointment.id}
                className="flex flex-col justify-between gap-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center"
              >
                <span className="font-medium text-slate-900">
                  {appointment.patient.user.name}
                  <span className="font-normal text-slate-500">
                    {" "}
                    com {appointment.doctor.user.name}
                  </span>
                </span>
                <span className="text-slate-500">
                  {formatDateTimePtBr(appointment.startDatetime)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
