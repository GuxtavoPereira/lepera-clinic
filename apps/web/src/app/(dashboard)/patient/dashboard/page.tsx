"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  CalendarPlus,
  Clock3,
  FileText,
  User,
  UserRound,
} from "lucide-react";
import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/stat-card";
import { Alert } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";
import { formatDateTimePtBr } from "@/lib/date-format";

type Appointment = {
  id: string;
  startDatetime: string;
  durationMinutes: number;
  modality: "IN_PERSON" | "ONLINE";
  status: string;
  doctor: { user: { name: string } };
};

type ScheduleRequest = { id: string; status: "PENDING" | "APPROVED" | "REJECTED" };

type Summary = {
  next: Appointment | null;
  upcoming: number;
  completed: number;
  pendingRequests: number;
};

const ACTIVE = ["SCHEDULED", "CONFIRMED"];

export default function PatientDashboardPage() {
  const user = useCurrentUser();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<Appointment[]>("/appointments/mine"),
      apiFetch<ScheduleRequest[]>("/schedule-requests/mine"),
    ])
      .then(([appointments, requests]) => {
        if (!active) return;
        const now = Date.now();
        const upcoming = appointments
          .filter(
            (item) =>
              ACTIVE.includes(item.status) &&
              new Date(item.startDatetime).getTime() >= now,
          )
          .sort(
            (a, b) =>
              new Date(a.startDatetime).getTime() -
              new Date(b.startDatetime).getTime(),
          );
        setSummary({
          next: upcoming[0] ?? null,
          upcoming: upcoming.length,
          completed: appointments.filter((item) => item.status === "COMPLETED")
            .length,
          pendingRequests: requests.filter((item) => item.status === "PENDING")
            .length,
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

  const firstName = user?.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardHeader
        title={firstName ? `Olá, ${firstName}` : "Olá"}
        subtitle="Acompanhe suas consultas e solicitações."
      />

      {error && <Alert kind="error">{error}</Alert>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-500">Próxima consulta</h2>
        {!summary ? (
          <p className="mt-3 text-sm text-slate-400">Carregando...</p>
        ) : summary.next ? (
          <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-xl font-semibold text-slate-900">
                {formatDateTimePtBr(summary.next.startDatetime)}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <UserRound className="size-4 text-slate-400" />
                {summary.next.doctor.user.name}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Clock3 className="size-4 text-slate-400" />
                {summary.next.durationMinutes} minutos ·{" "}
                {summary.next.modality === "ONLINE" ? "Online" : "Presencial"}
              </p>
            </div>
            <Link
              href="/patient/appointments"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
            >
              Ver detalhes ou cancelar
            </Link>
          </div>
        ) : (
          <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-600">
              Você não tem consultas marcadas.
            </p>
            <Link
              href="/patient/request-appointment"
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              <CalendarPlus className="size-4" />
              Solicitar agendamento
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Consultas futuras"
          value={summary?.upcoming ?? "—"}
          icon={Calendar}
          href="/patient/appointments"
        />
        <StatCard
          label="Realizadas"
          value={summary?.completed ?? "—"}
          icon={CalendarCheck}
          href="/patient/appointments"
        />
        <StatCard
          label="Solicitações em análise"
          value={summary?.pendingRequests ?? "—"}
          icon={FileText}
          href="/patient/appointments"
          tone={summary && summary.pendingRequests > 0 ? "warning" : "default"}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/patient/request-appointment"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
        >
          <CalendarPlus className="size-4" />
          Solicitar agendamento
        </Link>
        <Link
          href="/patient/profile"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-muted"
        >
          <User className="size-4" />
          Meu perfil
        </Link>
      </div>
    </div>
  );
}
