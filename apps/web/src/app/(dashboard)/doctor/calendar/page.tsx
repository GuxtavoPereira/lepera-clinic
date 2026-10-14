"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ClipboardList, Clock3, UserRound } from "lucide-react";
import { RequestCancellationButton } from "@/components/appointments/request-cancellation-button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "WAITING";

type Appointment = {
  id: string;
  startDatetime: string;
  durationMinutes: number;
  modality: "IN_PERSON" | "ONLINE";
  type: "SESSION" | "EVALUATION" | "RETURN" | "CLOSURE";
  status: AppointmentStatus;
  cancelReason: string | null;
  patient: { user: { name: string } };
};

type CancellationRequest = {
  id: string;
  appointmentId: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
};

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

const appointmentTypeLabels: Record<Appointment["type"], string> = {
  SESSION: "Sessão",
  EVALUATION: "Avaliação",
  RETURN: "Retorno",
  CLOSURE: "Encerramento",
};

function fetchPage() {
  return Promise.all([
    apiFetch<Appointment[]>("/appointments/mine"),
    apiFetch<CancellationRequest[]>("/cancellation-requests/mine"),
  ]);
}

// A API devolve do mais recente para o mais antigo: o primeiro de cada
// consulta é o pedido mais recente.
function latestByAppointment(requests: CancellationRequest[]) {
  const map = new Map<string, CancellationRequest>();
  for (const request of requests) {
    if (!map.has(request.appointmentId)) map.set(request.appointmentId, request);
  }
  return map;
}

function AppointmentCard({
  appointment,
  request,
  onRequested,
}: {
  appointment: Appointment;
  request: CancellationRequest | undefined;
  onRequested: () => void | Promise<void>;
}) {
  const active =
    appointment.status !== "CANCELLED" && appointment.status !== "RESCHEDULED";
  const canRequest =
    (appointment.status === "SCHEDULED" ||
      appointment.status === "CONFIRMED") &&
    request?.status !== "PENDING";

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="space-y-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              {appointment.patient.user.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {appointmentTypeLabels[appointment.type]}
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
              {appointment.modality === "ONLINE" ? "Online" : "Presencial"}
            </p>
          </div>

          {appointment.status === "CANCELLED" && appointment.cancelReason && (
            <p className="text-sm text-red-700">
              Motivo do cancelamento: {appointment.cancelReason}
            </p>
          )}

          {request?.status === "PENDING" && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Cancelamento solicitado — aguardando a recepção.
            </p>
          )}
          {request?.status === "REJECTED" && appointment.status !== "CANCELLED" && (
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              Pedido de cancelamento recusado
              {request.reviewNote ? `: ${request.reviewNote}` : "."}
            </p>
          )}

          <div className="flex flex-wrap items-start gap-2">
            {active && (
              <Link
                href={`/doctor/session/${appointment.id}`}
                className="inline-flex h-7 items-center justify-center gap-1 rounded-lg bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground transition hover:bg-primary/80"
              >
                <ClipboardList className="size-3.5" />
                Abrir prontuário
              </Link>
            )}
            {canRequest && (
              <RequestCancellationButton
                appointmentId={appointment.id}
                onRequested={onRequested}
              />
            )}
          </div>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClasses[appointment.status]}`}
        >
          {statusLabels[appointment.status]}
        </span>
      </div>
    </li>
  );
}

export default function DoctorCalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const [mine, myRequests] = await fetchPage();
      setAppointments(mine);
      setRequests(myRequests);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a agenda.",
      );
    }
  }

  useEffect(() => {
    let active = true;
    void fetchPage()
      .then(([mine, myRequests]) => {
        if (!active) return;
        setAppointments(mine);
        setRequests(myRequests);
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
  }, []);

  const requestByAppointment = latestByAppointment(requests);
  const scheduled = appointments.filter(
    (appointment) => appointment.status !== "CANCELLED",
  );
  const cancelled = appointments.filter(
    (appointment) => appointment.status === "CANCELLED",
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Calendar className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Minha agenda</h1>
          <p className="mt-1 text-sm text-slate-500">
            Consultas vinculadas ao seu perfil profissional. Para cancelar uma
            consulta, envie um pedido à recepção.
          </p>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando sua agenda...</p>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
          <UserRound className="mx-auto size-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            Você ainda não tem consultas na agenda.
          </p>
        </div>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Consultas
            </h2>
            {scheduled.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Não há consultas ativas na agenda.
              </p>
            ) : (
              <ul className="space-y-3">
                {scheduled.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    request={requestByAppointment.get(appointment.id)}
                    onRequested={reload}
                  />
                ))}
              </ul>
            )}
          </section>

          {cancelled.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Consultas canceladas
              </h2>
              <ul className="space-y-3">
                {cancelled.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    request={requestByAppointment.get(appointment.id)}
                    onRequested={reload}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
