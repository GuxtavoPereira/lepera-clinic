"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Calendar,
  CalendarCheck,
  ClipboardList,
  Clock3,
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
  patient: { user: { name: string } };
};

type RecordSummary = { isSigned: boolean };
type CancellationRequest = { status: "PENDING" | "APPROVED" | "REJECTED" };

type Summary = {
  today: Appointment[];
  upcoming: number;
  pendingSignature: number;
  pendingCancellations: number;
};

const ACTIVE = ["SCHEDULED", "CONFIRMED", "WAITING"];

export default function DoctorDashboardPage() {
  const user = useCurrentUser();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<Appointment[]>("/appointments/mine"),
      apiFetch<RecordSummary[]>("/clinical-records/mine"),
      apiFetch<CancellationRequest[]>("/cancellation-requests/mine"),
    ])
      .then(([appointments, records, requests]) => {
        if (!active) return;
        const now = Date.now();
        const todayKey = new Date(now).toLocaleDateString("pt-BR");
        const activeOnes = appointments.filter((item) =>
          ACTIVE.includes(item.status),
        );
        setSummary({
          today: activeOnes
            .filter(
              (item) =>
                new Date(item.startDatetime).toLocaleDateString("pt-BR") ===
                todayKey,
            )
            .sort(
              (a, b) =>
                new Date(a.startDatetime).getTime() -
                new Date(b.startDatetime).getTime(),
            ),
          upcoming: activeOnes.filter(
            (item) => new Date(item.startDatetime).getTime() >= now,
          ).length,
          pendingSignature: records.filter((item) => !item.isSigned).length,
          pendingCancellations: requests.filter(
            (item) => item.status === "PENDING",
          ).length,
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

  const firstName = user?.name.split(" ").slice(0, 2).join(" ");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardHeader
        title={firstName ? `Olá, ${firstName}` : "Olá"}
        subtitle="Resumo do seu dia e pendências."
      />

      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Consultas hoje"
          value={summary?.today.length ?? "—"}
          icon={CalendarCheck}
          href="/doctor/calendar"
        />
        <StatCard
          label="Próximas consultas"
          value={summary?.upcoming ?? "—"}
          icon={Calendar}
          href="/doctor/calendar"
        />
        <StatCard
          label="Aguardando assinatura"
          value={summary?.pendingSignature ?? "—"}
          icon={ClipboardList}
          href="/doctor/records"
          tone={summary && summary.pendingSignature > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Cancelamentos solicitados"
          value={summary?.pendingCancellations ?? "—"}
          hint="Aguardando a recepção"
          icon={Ban}
          href="/doctor/calendar"
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Hoje</h2>
        {!summary ? (
          <p className="text-sm text-slate-400">Carregando...</p>
        ) : summary.today.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            Nenhuma consulta para hoje.
          </p>
        ) : (
          <ul className="space-y-2">
            {summary.today.map((appointment) => (
              <li
                key={appointment.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-slate-900">
                    {appointment.patient.user.name}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 className="size-4 text-slate-400" />
                    {formatDateTimePtBr(appointment.startDatetime)} ·{" "}
                    {appointment.durationMinutes} min ·{" "}
                    {appointment.modality === "ONLINE" ? "Online" : "Presencial"}
                  </p>
                </div>
                <Link
                  href={`/doctor/session/${appointment.id}`}
                  className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
                >
                  <ClipboardList className="size-3.5" />
                  Abrir prontuário
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
