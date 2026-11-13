"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CalendarPlus, Check, Loader2, X } from "lucide-react";
import { ReceptionAppointmentCard, type ReceptionAppointment as ListedAppointment } from "@/components/appointments/reception-appointment-card";
import type { RescheduledAppointment } from "@/components/appointments/reschedule-appointment-button";
import { FormField, inputClassName } from "@/components/forms/form-field";
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
type DoctorOption = { id: string; user: { name: string } };

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
  return (
    <Suspense fallback={<p role="status">Carregando agenda…</p>}>
      <ReceptionAppointments />
    </Suspense>
  );
}

function ReceptionAppointments() {
  const searchParams = useSearchParams();
  const onlyCancellations = searchParams.get("view") === "pending-cancellations";
  const selectedId = searchParams.get("appointment");
  const [selected, setSelected] = useState<{ id: string; appointment: ListedAppointment | null; error?: string } | null>(null);
  const [notice, setNotice] = useState<RescheduledAppointment | null>(null);
  const [scope, setScope] = useState<Scope>("upcoming");
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [doctorId, setDoctorId] = useState("");
  const [day, setDay] = useState("");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [doctorError, setDoctorError] = useState(false);
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [data, setData] = useState<AppointmentsPage | null>(null);
  const [pending, setPending] = useState<PendingCancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (onlyCancellations) return;
    const controller = new AbortController();
    void apiFetch<DoctorOption[]>("/doctors", { signal: controller.signal })
      .then((items) => {
        if (controller.signal.aborted) return;
        setDoctors(items);
        setDoctorError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDoctorError(true);
      });
    return () => controller.abort();
  }, [onlyCancellations]);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      scope,
    });
    if (status) params.set("status", status);
    if (doctorId) params.set("doctorId", doctorId);
    if (day) params.set("day", day);

    void Promise.all([
      onlyCancellations
        ? Promise.resolve(null)
        : apiFetch<AppointmentsPage>(`/appointments?${params.toString()}`),
      apiFetch<PendingCancellation[]>("/cancellation-requests/pending"),
    ])
      .then(([appointments, requests]) => {
        if (!active) return;
        if (appointments) setData(appointments);
        setPending(requests);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setData(null);
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
  }, [scope, status, doctorId, day, page, reloadKey, onlyCancellations]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void apiFetch<ListedAppointment>(`/appointments/${encodeURIComponent(selectedId)}`, { signal: controller.signal })
      .then((appointment) => { if (!controller.signal.aborted) setSelected({ id: selectedId, appointment }); })
      .catch((err: unknown) => { if (!controller.signal.aborted) setSelected({ id: selectedId, appointment: null, error: err instanceof ApiError && err.status === 404 ? "Esta consulta está indisponível." : "Não foi possível carregar a consulta. Tente novamente." }); });
    return () => controller.abort();
  }, [selectedId, reloadKey]);

  function onRescheduled(result: RescheduledAppointment) {
    setNotice(result);
    reload();
  }

  function reload() {
    setLoading(true);
    setSelected(null);
    setReloadKey((key) => key + 1);
  }

  function changeScope(next: Scope) {
    if (next === scope) return;
    setLoading(true);
    setPage(1);
    setScope(next);
  }

  function changeStatus(next: AppointmentStatus | "") {
    setLoading(true);
    setPage(1);
    setStatus(next);
  }

  function changeDoctor(next: string) {
    setLoading(true);
    setPage(1);
    setDoctorId(next);
  }

  function changeDay(next: string) {
    setLoading(true);
    setPage(1);
    setDay(next);
    if (next) setScope("all");
  }

  function clearFilters() {
    setLoading(true);
    setPage(1);
    setScope("upcoming");
    setStatus("");
    setDoctorId("");
    setDay("");
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  const successNotice = notice && <div role="status" className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
    <p>Consulta remarcada para {formatDateTimePtBr(notice.startDatetime)}. O horário anterior permanece no histórico.</p>
    <Link href={`/reception/appointments?appointment=${encodeURIComponent(notice.id)}`} className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">Ver nova consulta</Link>
  </div>;

  if (selectedId) {
    const current = selected?.id === selectedId ? selected : null;
    return <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/reception/appointments" className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent">Voltar para agenda geral</Link>
      <h1 className="text-2xl font-semibold">Detalhes da consulta</h1>
      {successNotice}
      {!current ? <p role="status">Carregando consulta…</p> : current.error ? <div className="space-y-3"><p role="alert">{current.error}</p><Button variant="outline" onClick={reload}>Tentar novamente</Button></div> : current.appointment && <ul><ReceptionAppointmentCard appointment={current.appointment} onChanged={reload} onRescheduled={onRescheduled} /></ul>}
    </div>;
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
              {onlyCancellations ? "Pedidos de cancelamento" : "Agenda geral"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {onlyCancellations
                ? "Pedidos de cancelamento de consulta aguardando análise da recepção."
                : "Consulte os horários, remarque consultas e analise os pedidos dos profissionais."}
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
      {onlyCancellations && (
        <Link href="/reception/appointments" className="ml-2 inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent">
          Ver todas as consultas
        </Link>
      )}

      {successNotice}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {(onlyCancellations || pending.length > 0) && !error && (
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
          {loading ? (
            <p role="status" className="text-sm text-muted-foreground">Carregando pedidos…</p>
          ) : pending.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Nenhum pedido de cancelamento em análise.</p>
          ) : <ul className="space-y-3">
            {pending.map((request) => (
              <CancellationReviewCard
                key={request.id}
                request={request}
                onDone={reload}
              />
            ))}
          </ul>}
        </section>
      )}

      {!onlyCancellations && <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {SCOPES.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={scope === item.value}
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
          {(scope !== "upcoming" || status || doctorId || day) && (
            <Button type="button" variant="outline" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField id="agenda-doctor" label="Profissional">
            <select
              id="agenda-doctor"
              className={inputClassName}
              value={doctorId}
              disabled={doctors.length === 0}
              onChange={(event) => changeDoctor(event.target.value)}
            >
              <option value="">Todos os profissionais</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="agenda-day" label="Dia da consulta">
            <input
              id="agenda-day"
              type="date"
              className={inputClassName}
              value={day}
              onChange={(event) => changeDay(event.target.value)}
            />
          </FormField>
          <FormField id="agenda-status" label="Status da consulta">
            <select
              id="agenda-status"
              className={inputClassName}
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
          </FormField>
        </div>
        {doctorError && (
          <p role="status" className="text-sm text-muted-foreground">
            Não foi possível carregar os profissionais para filtrar a agenda.
          </p>
        )}

        {error ? null : loading || !data ? (
          <p className="text-sm text-slate-500">Carregando consultas...</p>
        ) : !data || data.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Nenhuma consulta encontrada para este filtro.
          </p>
        ) : (
          <>
            <ul className="space-y-3">
              {data.items.map((appointment) => <ReceptionAppointmentCard
                key={appointment.id}
                appointment={appointment}
                onChanged={reload}
                onRescheduled={onRescheduled}
              />)}
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
      </section>}
    </div>
  );
}
