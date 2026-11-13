"use client";

import Link from "next/link";
import { useState } from "react";
import { Calendar, Clock3 } from "lucide-react";
import { CancelAppointmentButton } from "./cancel-appointment-button";
import {
  RescheduleAppointmentButton,
  type ReschedulableAppointment,
  type RescheduledAppointment,
} from "./reschedule-appointment-button";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTimePtBr } from "@/lib/date-format";

export type ReceptionAppointment = ReschedulableAppointment & {
  status:
    | "SCHEDULED"
    | "CONFIRMED"
    | "COMPLETED"
    | "CANCELLED"
    | "RESCHEDULED"
    | "WAITING";
  endDatetime: string;
  cancelReason: string | null;
  rescheduledToId: string | null;
  cancellationRequests: { id: string; reason: string }[];
};

const labels: Record<ReceptionAppointment["status"], string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Remarcada",
  WAITING: "Aguardando atendimento",
};
const colors: Record<ReceptionAppointment["status"], string> = {
  SCHEDULED: "bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  CONFIRMED:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  COMPLETED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
  RESCHEDULED:
    "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  WAITING:
    "bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
};

export function ReceptionAppointmentCard({
  appointment,
  onChanged,
  onRescheduled,
}: {
  appointment: ReceptionAppointment;
  onChanged: () => void;
  onRescheduled: (result: RescheduledAppointment) => void;
}) {
  const [now] = useState(Date.now);
  const cancellable =
    appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED";
  const canReschedule =
    cancellable &&
    Date.parse(appointment.startDatetime) > now &&
    appointment.cancellationRequests.length === 0;
  return (
    <li className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 space-y-3">
          <div>
            <p className="font-semibold">{appointment.patient.user.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              com {appointment.doctor.user.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Calendar aria-hidden="true" className="size-4 shrink-0" />
              {formatDateTimePtBr(appointment.startDatetime)}
            </p>
            <p className="flex items-center gap-2">
              <Clock3 aria-hidden="true" className="size-4 shrink-0" />
              {appointment.durationMinutes} minutos ·{" "}
              {appointment.modality === "ONLINE" ? "Online" : "Presencial"}
            </p>
          </div>
          {appointment.status === "CANCELLED" && appointment.cancelReason && (
            <p className="break-words text-sm text-destructive">
              Motivo do cancelamento: {appointment.cancelReason}
            </p>
          )}
          {appointment.cancellationRequests.length > 0 && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
              O profissional pediu o cancelamento. Analise o pedido antes de
              remarcar.
            </p>
          )}
          <div className="flex flex-wrap items-start gap-2">
            {canReschedule && (
              <RescheduleAppointmentButton
                appointment={appointment}
                onRescheduled={onRescheduled}
                onRefresh={onChanged}
              />
            )}
            {cancellable && (
              <CancelAppointmentButton
                appointmentId={appointment.id}
                onCancelled={onChanged}
              />
            )}
            {appointment.status === "RESCHEDULED" &&
              appointment.rescheduledToId && (
                <Link
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "min-h-11",
                  })}
                  href={`/reception/appointments?appointment=${encodeURIComponent(appointment.rescheduledToId)}`}
                >
                  Ver nova consulta
                </Link>
              )}
          </div>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-medium ${colors[appointment.status]}`}
        >
          {labels[appointment.status]}
        </span>
      </div>
    </li>
  );
}
