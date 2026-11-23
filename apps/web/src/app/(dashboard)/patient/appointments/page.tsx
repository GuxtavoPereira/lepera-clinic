"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, CalendarPlus, Clock3, UserRound } from "lucide-react";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import {
  NotificationAppointment,
  UnavailableNotificationAppointment,
} from "@/components/appointments/notification-appointment";
import { DashboardLoading } from "@/components/dashboard/dashboard-ui";
import { isCurrentAppointment, isUpcomingAppointment } from "@/components/dashboard/dashboard-data";
import { ApiError, apiFetch } from "@/lib/api-client";
import { calendarDateKey, calendarIntervalOnDay } from "@/lib/calendar";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "WAITING";

type Appointment = {
  id: string;
  doctorId: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes: number;
  modality: "IN_PERSON" | "ONLINE";
  type: "SESSION" | "EVALUATION" | "RETURN" | "CLOSURE";
  status: AppointmentStatus;
  cancelReason: string | null;
  rescheduledToId?: string | null;
  doctor: { user: { name: string } };
};

type ScheduleRequest = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  preferredDate: string | null;
  preferredShift: string | null;
  preferredDoctor: { user: { name: string } } | null;
  generatedAppointment: Appointment | null;
  createdAt: string;
};

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Remarcada",
  WAITING: "Aguardando atendimento",
};

const appointmentStatusClasses: Record<AppointmentStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-800",
  CONFIRMED: "bg-emerald-50 text-emerald-800",
  COMPLETED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-50 text-red-800",
  RESCHEDULED: "bg-amber-50 text-amber-800",
  WAITING: "bg-violet-50 text-violet-800",
};

const requestStatusLabels: Record<ScheduleRequest["status"], string> = {
  PENDING: "Em análise",
  APPROVED: "Aprovada",
  REJECTED: "Recusada",
};

const requestStatusClasses: Record<ScheduleRequest["status"], string> = {
  PENDING: "bg-amber-50 text-amber-800",
  APPROVED: "bg-emerald-50 text-emerald-800",
  REJECTED: "bg-slate-100 text-slate-700",
};

const APPOINTMENT_VIEWS = [
  { value: "all", label: "Todas" },
  { value: "today", label: "Hoje" },
  { value: "upcoming", label: "Próximas" },
  { value: "completed", label: "Realizadas" },
  { value: "pending", label: "Pedidos em análise" },
] as const;

function appointmentTypeLabel(type: Appointment["type"]) {
  const labels: Record<Appointment["type"], string> = {
    SESSION: "Sessão",
    EVALUATION: "Avaliação",
    RETURN: "Retorno",
    CLOSURE: "Encerramento",
  };
  return labels[type];
}

async function fetchPage() {
  const [appointments, requests] = await Promise.all([
    apiFetch<Appointment[]>("/appointments/mine"),
    apiFetch<ScheduleRequest[]>("/schedule-requests/mine"),
  ]);
  return { appointments, requests, loadedAt: Date.now() };
}

function AppointmentCard({
  appointment,
  isApprovedRequest = false,
  onCancelled,
}: {
  appointment: Appointment;
  isApprovedRequest?: boolean;
  onCancelled: () => void | Promise<void>;
}) {
  const canCancel =
    appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED";

  return (
    <li
      id={`appointment-${appointment.id}`}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-slate-900">
              {appointmentTypeLabel(appointment.type)}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <UserRound className="size-4 text-slate-400" />
              {appointment.doctor.user.name}
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
              {appointment.modality === "ONLINE" ? "Online (registro anterior)" : "Presencial"}
            </p>
          </div>
          {appointment.status === "CANCELLED" && appointment.cancelReason && (
            <p className="text-sm text-red-700">
              Motivo do cancelamento: {appointment.cancelReason}
            </p>
          )}
          {isApprovedRequest && (
            <p className="text-xs text-muted-foreground">Originada de um pedido aprovado.</p>
          )}
          {appointment.status === "RESCHEDULED" && appointment.rescheduledToId && (
            <Link href={`/patient/appointments?appointment=${encodeURIComponent(appointment.rescheduledToId)}`} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-accent">
              Ver nova consulta
            </Link>
          )}
          {canCancel && (
            <CancelAppointmentButton
              appointmentId={appointment.id}
              onCancelled={onCancelled}
            />
          )}
        </div>
        <span
          className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${appointmentStatusClasses[appointment.status]}`}
        >
          {appointmentStatusLabels[appointment.status]}
        </span>
      </div>
    </li>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <PatientAppointments />
    </Suspense>
  );
}

function PatientAppointments() {
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const notificationAppointmentId = searchParams.get("appointment");
  const view = APPOINTMENT_VIEWS.find(({ value }) => value === requestedView)?.value ?? "all";
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchPage>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setData(await fetchPage());
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar suas consultas.",
      );
    }
  }

  useEffect(() => {
    let active = true;
    void fetchPage()
      .then((result) => {
        if (!active) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar suas consultas.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const appointments = data?.appointments ?? [];
  const requests = data?.requests ?? [];
  const linked = requests.flatMap((request) =>
    request.status === "APPROVED" && request.generatedAppointment ? [request.generatedAppointment] : [],
  );
  const linkedIds = new Set(linked.map(({ id }) => id));
  const notificationAppointment = notificationAppointmentId
    ? appointments.find(({ id }) => id === notificationAppointmentId)
    : undefined;

  if (notificationAppointment) {
    return (
      <NotificationAppointment
        key={notificationAppointment.id}
        backHref="/patient/appointments"
        backLabel="Ver todas as consultas"
        error={error}
      >
        <AppointmentCard
          appointment={notificationAppointment}
          isApprovedRequest={linkedIds.has(notificationAppointment.id)}
          onCancelled={reload}
        />
      </NotificationAppointment>
    );
  }

  const appointmentIds = new Set(appointments.map(({ id }) => id));
  const day = data ? calendarDateKey(new Date(data.loadedAt)) : "";
  const visibleAppointments = view === "all"
    ? [...appointments, ...linked.filter(({ id }) => !appointmentIds.has(id))]
    : appointments.filter((item) => {
        if (view === "today") return isCurrentAppointment(item) && calendarIntervalOnDay(item.startDatetime, item.endDatetime, day);
        if (view === "upcoming") return data && isUpcomingAppointment(item, data.loadedAt);
        return view === "completed" && item.status === "COMPLETED";
      });
  const visibleRequests = requests.filter((request) => view === "pending"
    ? request.status === "PENDING"
    : request.status !== "APPROVED" || !request.generatedAppointment,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Minhas consultas
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe consultas agendadas, solicitações em análise e
            cancelamentos.
          </p>
        </div>
        <Link
          href="/patient/request-appointment"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CalendarPlus className="size-4" />
          Solicitar agendamento
        </Link>
      </header>

      <Link href="/patient/calendar" className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium transition hover:bg-muted">
        <Calendar className="size-4" />
        Ver calendário e horários livres
      </Link>

      <nav aria-label="Filtrar consultas e pedidos" className="flex flex-wrap gap-2">
        {APPOINTMENT_VIEWS.map(({ value, label }) => (
          <Link
            key={value}
            href={value === "all" ? "/patient/appointments" : `/patient/appointments?view=${value}`}
            aria-current={view === value ? "true" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring ${view === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-card-foreground hover:bg-accent"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {notificationAppointmentId && !loading && !error && (
        <UnavailableNotificationAppointment />
      )}

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando suas consultas...</p>
      ) : (
        <>
          {view !== "pending" && <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Consultas
            </h2>
            {visibleAppointments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Nenhuma consulta encontrada neste filtro.
              </p>
            ) : (
              <ul className="space-y-3">
                {visibleAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    isApprovedRequest={linkedIds.has(appointment.id)}
                    onCancelled={reload}
                  />
                ))}
              </ul>
            )}

          </section>}

          {(view === "all" || view === "pending") && <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Solicitações
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pedidos enviados à recepção e ainda sem consulta vinculada.
              </p>
            </div>
            {visibleRequests.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Você não tem solicitações aguardando análise.
              </p>
            ) : (
              <ul className="space-y-3">
                {visibleRequests.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-slate-900">
                        Pedido de agendamento
                        {request.preferredDoctor &&
                          ` · ${request.preferredDoctor.user.name}`}
                      </p>
                      <p className="text-slate-500">
                        Preferência de data:{" "}
                        {request.preferredDate
                          ? formatDatePtBr(request.preferredDate)
                          : "sem data específica"}
                      </p>
                      <p className="text-xs text-slate-400">
                        Enviada em {formatDateTimePtBr(request.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${requestStatusClasses[request.status]}`}
                    >
                      {requestStatusLabels[request.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>}
        </>
      )}
    </div>
  );
}
