"use client";

import { useEffect, useState } from "react";
import type { AppointmentStatus } from "@lepera/contracts";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ClipboardList,
  Copy,
  FileText,
  Loader2,
  MessageSquareText,
  Printer,
  ScrollText,
} from "lucide-react";
import {
  dashboardActionClass,
  DashboardEmpty,
  DashboardLoading,
  DashboardSection,
} from "@/components/dashboard/dashboard-ui";
import { Alert } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { maskPhone } from "@/lib/br-format";
import { formatDateTimePtBr } from "@/lib/date-format";

type PatientSummary = {
  user: { name: string; email: string | null; age: number | null };
  phones: { phone: string }[];
  appointments: {
    id: string;
    startDatetime: string;
    status: AppointmentStatus;
  }[];
};

type ParagraphSummary = {
  generatedAt: string;
  patient: {
    id: string;
    name: string;
    civilName: string | null;
    age: number | null;
    insuranceProvider: string | null;
  };
  doctor: {
    name: string;
    licenseNumber: string;
    specialty: string;
  };
  stats: {
    totalAppointments: number;
    completedAppointments: number;
    signedRecords: number;
    signedDocuments: number;
  };
  paragraph: string;
  disclaimer: string;
  sources: Array<{
    kind: "clinical_record" | "clinical_document";
    id: string;
    label: string;
    date: string;
    href: string;
  }>;
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

  const [summary, setSummary] = useState<ParagraphSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<PatientSummary>(
      `/patients/mine/${encodeURIComponent(patientId)}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setPatient(data);
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

  async function generateSummary() {
    setLoadingSummary(true);
    setSummaryError(null);
    setCopied(false);
    try {
      const data = await apiFetch<ParagraphSummary>(
        `/clinical-records/patient-summary/${encodeURIComponent(patientId)}`,
      );
      setSummary(data);
    } catch (cause) {
      setSummaryError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível gerar o resumo estruturado.",
      );
    } finally {
      setLoadingSummary(false);
    }
  }

  async function copyParagraph() {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.paragraph);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setSummaryError("Não foi possível copiar automaticamente.");
    }
  }

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
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/doctor/documents?patientId=${encodeURIComponent(patientId)}`}
            className={dashboardActionClass}
          >
            <FileText aria-hidden="true" className="size-4" />
            Documentos do paciente
          </Link>
          <Link
            href={`/doctor/messages?patientId=${encodeURIComponent(patientId)}`}
            className={dashboardActionClass}
          >
            <MessageSquareText aria-hidden="true" className="size-4" />
            Enviar orientação
          </Link>
        </div>
      </header>
      {error ? (
        <Alert kind="error">{error}</Alert>
      ) : patient ? (
        <>
          <DashboardSection title="Identificação e contato">
            <dl className="grid gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-sm text-muted-foreground">E-mail</dt>
                <dd className="break-all">
                  {patient.user.email ?? "Sem login próprio (dependente)"}
                </dd>
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

          <DashboardSection title="Resumo em parágrafo do paciente">
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Compilação estruturada a partir dos seus prontuários e
                  documentos assinados, com referência direta às fontes
                  originais (sem IA e sem diagnóstico automático).
                </p>
                <Button
                  type="button"
                  onClick={() => void generateSummary()}
                  disabled={loadingSummary}
                  className="min-h-10"
                >
                  {loadingSummary ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ScrollText className="size-4" />
                  )}
                  {summary ? "Atualizar resumo" : "Gerar resumo em parágrafo"}
                </Button>
              </div>

              {summaryError && <Alert kind="error">{summaryError}</Alert>}

              {summary && (
                <div className="space-y-4 border-t border-border pt-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
                      {summary.stats.totalAppointments} consulta(s)
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
                      {summary.stats.signedRecords} evolução(ões) assinada(s)
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
                      {summary.stats.signedDocuments} documento(s) assinado(s)
                    </span>
                  </div>

                  <p className="rounded-xl bg-muted/40 p-4 text-sm leading-6 text-foreground">
                    {summary.paragraph}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {summary.disclaimer}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void copyParagraph()}
                    >
                      {copied ? (
                        <Check className="size-4" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                      {copied ? "Copiado" : "Copiar parágrafo"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => window.print()}
                    >
                      <Printer className="size-4" />
                      Imprimir
                    </Button>
                  </div>

                  {summary.sources.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Registros originais referenciados (
                        {summary.sources.length})
                      </p>
                      <ul className="flex flex-wrap gap-2">
                        {summary.sources.map((src) => (
                          <li key={`${src.kind}-${src.id}`}>
                            <Link
                              href={src.href}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
                            >
                              {src.label} · {formatDateTimePtBr(src.date)}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </DashboardSection>

          <DashboardSection title="Consultas recentes com você">
            {patient.appointments.length === 0 ? (
              <DashboardEmpty>
                Nenhuma consulta anterior com você.
              </DashboardEmpty>
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
                          <ClipboardList
                            aria-hidden="true"
                            className="size-4"
                          />
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
