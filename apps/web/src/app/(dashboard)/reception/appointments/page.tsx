"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarPlus, Check, Clock3, Loader2, X } from "lucide-react";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "WAITING";

type ListedAppointment = {
  id: string;
  startDatetime: string;
  durationMinutes: number;
  modality: "IN_PERSON" | "ONLINE";
  status: AppointmentStatus;
  cancelReason: string | null;
  patient: { user: { name: string } };
  doctor: { user: { name: string } };
  cancellationRequests: { id: string; reason: string }[];
};

type AppointmentsPage = {
  items: ListedAppointment[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

type PendingCancellation = {
  id: string;
  reason: string;
  createdAt: string;
  appointment: {
    startDatetime: string;
    patient: { user: { name: string } };
    doctor: { user: { name: string } };
  };
};

type Scope = "upcoming" | "past" | "all";

const PAGE_SIZE = 10;

const SCOPES: Array<{ value: Scope; label: string }> = [
  { value: "upcoming", label: "Próximas" },
  { value: "past", label: "Anteriores" },
  { value: "all", label: "Todas" },
];

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Remarcada",
  WAITING: "Aguardando atendimento",
};

const statusClasses: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-800",
  CONFIRMED: "bg-emerald-50 text-emerald-800",
  COMPLETED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-50 text-red-800",
  RESCHEDULED: "bg-amber-50 text-amber-800",
  WAITING: "bg-violet-50 text-violet-800",
};

const selectClassName =
  "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

function CancellationReviewCard({
  request,
  onDone,
}: {
  request: PendingCancellation;
  onDone: () => void | Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "approve" | "reject") {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/cancellation-requests/${request.id}/${action}`, {
        method: "PATCH",
        body: JSON.stringify(
          action === "reject" ? { note: note.trim() } : {},
        ),
      });
      await onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir a análise.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-slate-900">
            {request.appointment.doctor.user.name} pediu para cancelar a
            consulta de {request.appointment.patient.user.name}
          </p>
          <p className="text-slate-600">
            Consulta em {formatDateTimePtBr(request.appointment.startDatetime)}
          </p>
          <p className="whitespace-pre-wrap text-slate-700">
            Motivo: {request.reason}
          </p>
          <p className="text-xs text-slate-400">
            Pedido em {formatDateTimePtBr(request.createdAt)}
          </p>
        </div>
        {!rejecting && (
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void run("approve")}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Aprovar e cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRejecting(true)}
              disabled={saving}
            >
              <X className="size-3.5" />
              Recusar
            </Button>
          </div>
        )}
      </div>

      {rejecting && (
        <div className="space-y-2">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
            placeholder="Por que o pedido foi recusado? (o profissional verá esta mensagem)"
            className="h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setRejecting(false)}
              disabled={saving}
            >
              Voltar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => void run("reject")}
              disabled={saving || note.trim().length < 3}
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Confirmar recusa
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          {error}
        </p>
      )}
    </li>
  );
}

export default function ReceptionAppointmentsPage() {
  const [scope, setScope] = useState<Scope>("upcoming");
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState<AppointmentsPage | null>(null);
  const [pending, setPending] = useState<PendingCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      scope,
    });
    if (status) params.set("status", status);

    void Promise.all([
      apiFetch<AppointmentsPage>(`/appointments?${params.toString()}`),
      apiFetch<PendingCancellation[]>("/cancellation-requests/pending"),
    ])
      .then(([appointments, requests]) => {
        if (!active) return;
        setData(appointments);
        setPending(requests);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar a agenda.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [scope, status, page, reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  function changeScope(next: Scope) {
    setLoading(true);
    setPage(1);
    setScope(next);
  }

  function changeStatus(next: AppointmentStatus | "") {
    setLoading(true);
    setPage(1);
    setStatus(next);
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Calendar className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Agenda geral
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Todas as consultas da clínica, com cancelamento e análise dos
              pedidos dos profissionais.
            </p>
          </div>
        </div>
        <Link
          href="/reception/appointments/new"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CalendarPlus className="size-4" />
          Novo agendamento
        </Link>
      </header>

      <Link href="/reception/calendar" className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium transition hover:bg-muted">
        <Calendar className="size-4" />
        Ver calendário por semana ou dia
      </Link>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pedidos de cancelamento dos profissionais
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {pending.length}
              </span>
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Aprovar cancela a consulta e libera o horário.
            </p>
          </div>
          <ul className="space-y-3">
            {pending.map((request) => (
              <CancellationReviewCard
                key={request.id}
                request={request}
                onDone={reload}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {SCOPES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => changeScope(item.value)}
                className={
                  scope === item.value
                    ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
          <select
            aria-label="Filtrar por status"
            className={selectClassName}
            value={status}
            onChange={(event) =>
              changeStatus(event.target.value as AppointmentStatus | "")
            }
          >
            <option value="">Todos os status</option>
            {(Object.keys(statusLabels) as AppointmentStatus[]).map((value) => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando consultas...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Nenhuma consulta encontrada para este filtro.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {data.items.map((appointment) => {
                const cancellable =
                  appointment.status === "SCHEDULED" ||
                  appointment.status === "CONFIRMED";
                return (
                  <li
                    key={appointment.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div className="space-y-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {appointment.patient.user.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            com {appointment.doctor.user.name}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                          <p className="flex items-center gap-2">
                            <Calendar className="size-4 text-slate-400" />
                            {formatDateTimePtBr(appointment.startDatetime)}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock3 className="size-4 text-slate-400" />
                            {appointment.durationMinutes} minutos ·{" "}
                            {appointment.modality === "ONLINE"
                              ? "Online"
                              : "Presencial"}
                          </p>
                        </div>
                        {appointment.status === "CANCELLED" &&
                          appointment.cancelReason && (
                            <p className="text-sm text-red-700">
                              Motivo do cancelamento: {appointment.cancelReason}
                            </p>
                          )}
                        {appointment.cancellationRequests.length > 0 && (
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            O profissional pediu o cancelamento — veja
                            &quot;Pedidos de cancelamento&quot; no topo da página.
                          </p>
                        )}
                        {cancellable && (
                          <CancelAppointmentButton
                            appointmentId={appointment.id}
                            onCancelled={reload}
                          />
                        )}
                      </div>
                      <span
                        className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClasses[appointment.status]}`}
                      >
                        {statusLabels[appointment.status]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>
                {data.total} consulta{data.total === 1 ? "" : "s"} · página{" "}
                {data.page} de {data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => goToPage(data.page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.totalPages}
                  onClick={() => goToPage(data.page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
