"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarPlus, Clock3, UserRound } from "lucide-react";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { ApiError, apiFetch } from "@/lib/api-client";
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

function appointmentTypeLabel(type: Appointment["type"]) {
  const labels: Record<Appointment["type"], string> = {
    SESSION: "Sessão",
    EVALUATION: "Avaliação",
    RETURN: "Retorno",
    CLOSURE: "Encerramento",
  };
  return labels[type];
}

function fetchPage() {
  return Promise.all([
    apiFetch<Appointment[]>("/appointments/mine"),
    apiFetch<ScheduleRequest[]>("/schedule-requests/mine"),
  ]);
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
  const statusLabel =
    isApprovedRequest && appointment.status !== "CANCELLED"
      ? "Aprovada"
      : appointmentStatusLabels[appointment.status];
  const statusClass =
    isApprovedRequest && appointment.status !== "CANCELLED"
      ? "bg-emerald-50 text-emerald-800"
      : appointmentStatusClasses[appointment.status];
  const canCancel =
    appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED";

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              {appointment.modality === "ONLINE" ? "Online" : "Presencial"}
            </p>
          </div>
          {appointment.status === "CANCELLED" && appointment.cancelReason && (
            <p className="text-sm text-red-700">
              Motivo do cancelamento: {appointment.cancelReason}
            </p>
          )}
          {canCancel && (
            <CancelAppointmentButton
              appointmentId={appointment.id}
              onCancelled={onCancelled}
            />
          )}
        </div>
        <span
          className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
    </li>
  );
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      const [patientAppointments, patientRequests] = await fetchPage();
      setAppointments(patientAppointments);
      setRequests(patientRequests);
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
      .then(([patientAppointments, patientRequests]) => {
        if (!active) return;
        setAppointments(patientAppointments);
        setRequests(patientRequests);
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

  const appointmentsCreatedFromRequests = new Set(
    requests
      .map((request) => request.generatedAppointment?.id)
      .filter((id): id is string => !!id),
  );
  const directAppointments = appointments.filter(
    (appointment) => !appointmentsCreatedFromRequests.has(appointment.id),
  );
  const requestsToDisplay = requests.filter(
    (request) =>
      request.status !== "APPROVED" || !request.generatedAppointment,
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
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Consultas
            </h2>
            {directAppointments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Você ainda não tem consultas cadastradas diretamente.
              </p>
            ) : (
              <ul className="space-y-3">
                {directAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onCancelled={reload}
                  />
                ))}
              </ul>
            )}

            {requests.flatMap((request) => {
              if (
                request.status !== "APPROVED" ||
                !request.generatedAppointment
              ) {
                return [];
              }
              return [
                <AppointmentCard
                  key={request.id}
                  appointment={request.generatedAppointment}
                  isApprovedRequest
                  onCancelled={reload}
                />,
              ];
            })}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Solicitações
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Pedidos enviados à recepção e ainda sem consulta vinculada.
              </p>
            </div>
            {requestsToDisplay.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Você não tem solicitações aguardando análise.
              </p>
            ) : (
              <ul className="space-y-3">
                {requestsToDisplay.map((request) => (
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
          </section>
        </>
      )}
    </div>
  );
}
