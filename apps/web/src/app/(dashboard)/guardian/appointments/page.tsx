"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Calendar,
  CalendarPlus,
  Clock3,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";
import { calendarDateKey } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName, textareaClassName } from "@/components/forms/form-field";
import { DashboardLoading } from "@/components/dashboard/dashboard-ui";
import {
  DependentSelector,
  type PortalAppointment,
  type PortalPatient,
  type PortalScheduleRequest,
} from "@/components/guardian/guardian-types";
import {
  requestStatusLabels,
  type DoctorOption,
} from "@/components/schedule-requests/types";

type AvailableSlot = {
  doctorId: string;
  doctorName: string;
  start: string;
  end: string;
};

const APPOINTMENT_STATUS: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  NO_SHOW: "Falta",
};

export default function GuardianAppointmentsPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <GuardianAppointmentsContent />
    </Suspense>
  );
}

function GuardianAppointmentsContent() {
  const params = useSearchParams();
  const initialPatientId = params.get("patientId") ?? "";

  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialPatientId);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [requests, setRequests] = useState<PortalScheduleRequest[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [refreshDetails, setRefreshDetails] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Request form state
  const [mode, setMode] = useState<"FLEXIBLE" | "EXACT">("FLEXIBLE");
  const [doctorId, setDoctorId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredShift, setPreferredShift] = useState("MORNING");
  const [reason, setReason] = useState("");
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const today = calendarDateKey(new Date());

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      apiFetch<{ items: PortalPatient[] }>("/portal/patients", {
        signal: controller.signal,
      }),
      apiFetch<DoctorOption[]>("/doctors", { signal: controller.signal }),
    ])
      .then(([pData, dData]) => {
        if (controller.signal.aborted) return;
        setPatients(pData.items);
        setDoctors(dData);
        const match = pData.items.find((p) => p.patientId === initialPatientId);
        setSelectedId(match?.patientId ?? pData.items[0]?.patientId ?? "");
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar os dados de agendamento.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [initialPatientId]);

  const reloadPatientData = useCallback(() => {
    setLoadingDetails(true);
    setError(null);
    setRefreshDetails((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void Promise.all([
      apiFetch<{ items: PortalAppointment[] }>(
        `/portal/patients/${selectedId}/appointments`,
        { signal: controller.signal },
      ),
      apiFetch<{ items: PortalScheduleRequest[] }>(
        `/portal/patients/${selectedId}/schedule-requests`,
        { signal: controller.signal },
      ),
    ])
      .then(([apptRes, reqRes]) => {
        if (controller.signal.aborted) return;
        setAppointments(apptRes.items);
        setRequests(reqRes.items);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar as consultas do dependente.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetails(false);
      });
    return () => controller.abort();
  }, [selectedId, refreshDetails]);

  useEffect(() => {
    if (mode !== "EXACT") return;
    const from = preferredDate || today;
    const toDate = new Date(`${from}T12:00:00Z`);
    toDate.setUTCDate(toDate.getUTCDate() + 14);
    const to = toDate.toISOString().slice(0, 10);
    const qs = new URLSearchParams({ from, to });
    if (doctorId) qs.set("doctorId", doctorId);

    const controller = new AbortController();
    void apiFetch<{ items: AvailableSlot[] }>(
      `/appointments/available-slots?${qs.toString()}`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setSlots(res.items.slice(0, 30));
        setSelectedSlot("");
      })
      .catch(() => {
        if (!controller.signal.aborted) setSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [mode, doctorId, preferredDate, today]);

  async function handleRequestSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || submitting) return;
    setError(null);
    setSuccess(null);

    let payload: Record<string, string | undefined>;
    if (mode === "EXACT") {
      const chosen = slots.find((s) => `${s.doctorId}|${s.start}` === selectedSlot);
      if (!chosen) {
        setError("Selecione um horário disponível na lista.");
        return;
      }
      payload = {
        type: appointments.length === 0 ? "novo_paciente" : "reagendamento",
        mode: "EXACT",
        modality: "IN_PERSON",
        preferredDoctorId: chosen.doctorId,
        requestedStartDatetime: chosen.start,
        reason: reason.trim() || undefined,
      };
    } else {
      if (!preferredDate && !preferredShift) {
        setError("Informe uma data ou turno de preferência.");
        return;
      }
      payload = {
        type: appointments.length === 0 ? "novo_paciente" : "reagendamento",
        mode: "FLEXIBLE",
        modality: "IN_PERSON",
        ...(doctorId ? { preferredDoctorId: doctorId } : {}),
        ...(preferredDate ? { preferredDate } : {}),
        ...(preferredShift ? { preferredShift } : {}),
        reason: reason.trim() || undefined,
      };
    }

    setSubmitting(true);
    try {
      await apiFetch(`/portal/patients/${selectedId}/schedule-requests`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSuccess(
        "Solicitação presencial enviada para a recepção. Você será notificado assim que for confirmada.",
      );
      setReason("");
      setSelectedSlot("");
      reloadPatientData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível enviar a solicitação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(appointmentId: string) {
    if (!selectedId || cancellingId) return;
    setCancellingId(appointmentId);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch(
        `/portal/patients/${selectedId}/appointments/${appointmentId}/cancel`,
        {
          method: "PATCH",
          body: JSON.stringify({
            reason: "Cancelado pelo responsável via portal",
          }),
        },
      );
      setSuccess("Consulta cancelada com sucesso.");
      reloadPatientData();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cancelar a consulta.",
      );
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Agendamentos do dependente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Solicite consultas presenciais, acompanhe aprovações da recepção e
            gerencie os horários marcados.
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={loadingDetails || !selectedId}
          onClick={reloadPatientData}
        >
          <RefreshCw
            className={loadingDetails ? "size-4 animate-spin" : "size-4"}
          />
          Atualizar
        </Button>
      </header>

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
          Carregando...
        </p>
      ) : (
        <>
          <DependentSelector
            patients={patients}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setSuccess(null);
            }}
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          {success && (
            <p
              role="status"
              className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground"
            >
              {success}
            </p>
          )}

          {selectedId && (
            <>
              <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <CalendarPlus className="size-5 text-primary" />
                  <h2 className="text-base font-semibold text-foreground">
                    Solicitar consulta presencial
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={mode === "FLEXIBLE" ? "default" : "outline"}
                    onClick={() => setMode("FLEXIBLE")}
                  >
                    Pedido por preferência / encaixe
                  </Button>
                  <Button
                    type="button"
                    variant={mode === "EXACT" ? "default" : "outline"}
                    onClick={() => {
                      setLoadingSlots(true);
                      setMode("EXACT");
                    }}
                  >
                    Escolher horário disponível
                  </Button>
                </div>

                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField id="req-doctor" label="Profissional">
                      <select
                        id="req-doctor"
                        className={inputClassName}
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                      >
                        <option value="">Qualquer profissional</option>
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.user.name} — {d.specialty}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField
                      id="req-date"
                      label={
                        mode === "EXACT"
                          ? "A partir da data"
                          : "Data preferida (opcional)"
                      }
                    >
                      <input
                        id="req-date"
                        type="date"
                        min={today}
                        className={inputClassName}
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                      />
                    </FormField>

                    {mode === "FLEXIBLE" && (
                      <FormField id="req-shift" label="Turno preferido">
                        <select
                          id="req-shift"
                          className={inputClassName}
                          value={preferredShift}
                          onChange={(e) => setPreferredShift(e.target.value)}
                        >
                          <option value="MORNING">Manhã</option>
                          <option value="AFTERNOON">Tarde</option>
                          <option value="">Qualquer turno</option>
                        </select>
                      </FormField>
                    )}
                  </div>

                  {mode === "EXACT" && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Horários livres (próximos 14 dias)
                      </p>
                      {loadingSlots ? (
                        <p className="text-xs text-muted-foreground">
                          Buscando horários disponíveis...
                        </p>
                      ) : slots.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Nenhum horário disponível neste período. Tente outra
                          data ou use &ldquo;Pedido por preferência / encaixe&rdquo;.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {slots.map((slot) => {
                            const key = `${slot.doctorId}|${slot.start}`;
                            const active = selectedSlot === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setSelectedSlot(key)}
                                className={`rounded-xl border p-3 text-left text-xs transition ${
                                  active
                                    ? "border-primary bg-primary/10 font-semibold text-primary"
                                    : "border-border bg-background hover:bg-accent"
                                }`}
                              >
                                <p className="flex items-center gap-1.5 font-medium">
                                  <Clock3 className="size-3.5" />
                                  {formatDateTimePtBr(slot.start)}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                  {slot.doctorName}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <FormField
                    id="req-reason"
                    label="Observação para a recepção (opcional)"
                  >
                    <textarea
                      id="req-reason"
                      rows={2}
                      maxLength={500}
                      className={textareaClassName}
                      placeholder="Ex.: preferência de horário após a escola"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </FormField>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="min-h-11"
                      disabled={submitting}
                    >
                      {submitting && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Enviar solicitação presencial
                    </Button>
                  </div>
                </form>
              </section>

              <section className="space-y-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Calendar className="size-5 text-primary" />
                  Consultas ({appointments.length})
                </h2>
                {appointments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma consulta registrada para este dependente.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {appointments.map((appt) => {
                      const canCancel =
                        appt.status === "SCHEDULED" ||
                        appt.status === "CONFIRMED";
                      return (
                        <li
                          key={appt.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
                        >
                          <div className="space-y-1">
                            <p className="font-semibold text-foreground">
                              {formatDateTimePtBr(appt.startDatetime)} ·{" "}
                              {appt.doctor.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {appt.doctor.specialty} · {appt.durationMinutes}{" "}
                              min · Presencial
                              {appt.roomOrLink ? ` · ${appt.roomOrLink}` : ""}
                            </p>
                            <span className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                              {APPOINTMENT_STATUS[appt.status] ?? appt.status}
                            </span>
                          </div>
                          {canCancel && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-10 text-destructive hover:text-destructive"
                              disabled={cancellingId === appt.id}
                              onClick={() => void handleCancel(appt.id)}
                            >
                              {cancellingId === appt.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <XCircle className="size-4" />
                              )}
                              Cancelar
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Solicitações enviadas ({requests.length})
                </h2>
                {requests.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    Nenhuma solicitação enviada para este dependente.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {requests.map((req) => (
                      <li
                        key={req.id}
                        className="rounded-2xl border border-border bg-card p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-foreground">
                            {req.mode === "EXACT" && req.requestedStartDatetime
                              ? formatDateTimePtBr(req.requestedStartDatetime)
                              : `Preferência: ${req.preferredDate ? formatDatePtBr(req.preferredDate) : "Qualquer data"} · ${req.preferredShift === "MORNING" ? "Manhã" : req.preferredShift === "AFTERNOON" ? "Tarde" : "Qualquer turno"}`}
                          </span>
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            {requestStatusLabels[req.status] ?? req.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {req.preferredDoctor?.user.name ??
                            "Sem preferência de profissional"}{" "}
                          · Enviada em {formatDateTimePtBr(req.createdAt)}
                        </p>
                        {req.reason && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Observação: {req.reason}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
