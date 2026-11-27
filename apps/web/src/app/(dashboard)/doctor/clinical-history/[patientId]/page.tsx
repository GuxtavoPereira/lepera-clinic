"use client";

import { useEffect, useState } from "react";
import type { AppointmentStatus } from "@lepera/contracts";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList, FileText } from "lucide-react";
import {
  dashboardActionClass,
  DashboardEmpty,
  DashboardLoading,
  DashboardSection,
} from "@/components/dashboard/dashboard-ui";
import { Alert } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { maskPhone } from "@/lib/br-format";
import { formatDateTimePtBr } from "@/lib/date-format";

type PatientSummary = {
  user: { name: string; email: string; age: number | null };
  phones: { phone: string }[];
  appointments: { id: string; startDatetime: string; status: AppointmentStatus }[];
};

const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Remarcada",
  WAITING: "Aguardando atendimento",
};

export default function ClinicalHistoryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  return <PatientSummaryContent key={patientId} patientId={patientId} />;
}

function PatientSummaryContent({ patientId }: { patientId: string }) {
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<PatientSummary>(
      `/patients/mine/${encodeURIComponent(patientId)}`,
      { signal: controller.signal },
    )
      .then((summary) => {
        if (!controller.signal.aborted) setPatient(summary);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível carregar a ficha do paciente.",
        );
      });
    return () => controller.abort();
  }, [patientId]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/doctor/patients" className={dashboardActionClass}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Meus pacientes
      </Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Ficha do paciente</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {patient?.user.name ?? "Resumo do paciente"}
          </h1>
        </div>
        <Link
          href={`/doctor/documents?patientId=${encodeURIComponent(patientId)}`}
          className={dashboardActionClass}
        >
          <FileText aria-hidden="true" className="size-4" />
          Documentos do paciente
        </Link>
      </header>
      {error ? (
        <Alert kind="error">{error}</Alert>
      ) : patient ? (
        <>
          <DashboardSection title="Identificação e contato">
            <dl className="grid gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">E-mail</dt>
                <dd className="break-all">{patient.user.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Telefone</dt>
                <dd>
                  {patient.phones[0]
                    ? maskPhone(patient.phones[0].phone)
                    : "Não informado"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Idade</dt>
                <dd>
                  {patient.user.age === null
                    ? "Não informada"
                    : `${patient.user.age} ${patient.user.age === 1 ? "ano" : "anos"}`}
                </dd>
              </div>
            </dl>
          </DashboardSection>
          <DashboardSection title="Consultas recentes com você">
            {patient.appointments.length === 0 ? (
              <DashboardEmpty>Nenhuma consulta anterior com você.</DashboardEmpty>
            ) : (
              <ul className="space-y-2">
                {patient.appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground"
                  >
                    <div>
                      <p className="font-medium">
                        {formatDateTimePtBr(appointment.startDatetime)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {statusLabels[appointment.status]}
                      </p>
                    </div>
                    {appointment.status !== "CANCELLED" &&
                    appointment.status !== "RESCHEDULED" && (
                      <Link
                        href={`/doctor/session/${appointment.id}`}
                        className={dashboardActionClass}
                      >
                        <ClipboardList aria-hidden="true" className="size-4" />
                        Abrir prontuário
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </>
      ) : (
        <DashboardLoading />
      )}
    </div>
  );
}
