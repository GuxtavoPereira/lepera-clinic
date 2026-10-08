"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";

type ScheduleRequest = {
  id: string;
  type: string;
  preferredDoctorId: string | null;
  preferredDate: string | null;
  preferredShift: string | null;
  reason: string | null;
  createdAt: string;
  patient: { user: { name: string; email: string } };
  preferredDoctor: { user: { name: string } } | null;
};

type DoctorOption = {
  id: string;
  specialty: string;
  user: { name: string };
};

const inputClassName =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

function formatDate(value: string) {
  return formatDateTimePtBr(value);
}

export default function ReceptionRequestsPage() {
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("50");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<ScheduleRequest[]>("/schedule-requests/pending"),
      apiFetch<DoctorOption[]>("/doctors"),
    ])
      .then(([pendingRequests, availableDoctors]) => {
        if (!active) return;
        setRequests(pendingRequests);
        setDoctors(availableDoctors);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as solicitações.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function startApproval(request: ScheduleRequest) {
    setError(null);
    setActiveRequestId(request.id);
    setDoctorId(request.preferredDoctorId ?? "");
    setStartDatetime("");
    setDurationMinutes("50");
  }

  async function approve(requestId: string) {
    if (!startDatetime || !doctorId.trim()) {
      setError("Informe o profissional e a data/hora para confirmar.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/schedule-requests/${requestId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          doctorId: doctorId.trim(),
          startDatetime: new Date(startDatetime).toISOString(),
          durationMinutes: Number(durationMinutes),
        }),
      });
      setRequests((current) => current.filter((item) => item.id !== requestId));
      setActiveRequestId(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível aprovar a solicitação.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function reject(requestId: string) {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/schedule-requests/${requestId}/reject`, {
        method: "PATCH",
      });
      setRequests((current) => current.filter((item) => item.id !== requestId));
      if (activeRequestId === requestId) setActiveRequestId(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível recusar a solicitação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          Solicitações de agendamento
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Analise os pedidos dos pacientes e confirme um horário ou recuse a
          solicitação.
        </p>
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
        <p className="text-sm text-slate-500">Carregando solicitações...</p>
      ) : requests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Não há solicitações pendentes.
        </p>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li
              key={request.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row">
                <div className="space-y-1 text-sm">
                  <h2 className="font-semibold text-slate-900">
                    {request.patient.user.name}
                  </h2>
                  <p className="text-slate-500">{request.patient.user.email}</p>
                  <p className="pt-2 text-slate-700">
                    Solicitou um agendamento
                    {request.preferredDoctor &&
                      ` · preferência: ${request.preferredDoctor.user.name}`}
                  </p>
                  <p className="text-slate-500">
                    Preferência:{" "}
                    {request.preferredDate
                      ? formatDatePtBr(request.preferredDate)
                      : "qualquer data"}
                    {" · "}
                    {request.preferredShift === "MORNING"
                      ? "manhã"
                      : request.preferredShift === "AFTERNOON"
                        ? "tarde"
                        : "qualquer turno"}
                  </p>
                  {request.reason && (
                    <p className="max-w-2xl whitespace-pre-wrap pt-1 text-slate-600">
                      Observação: {request.reason}
                    </p>
                  )}
                  <p className="pt-1 text-xs text-slate-400">
                    Recebida em {formatDate(request.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-2">
                  <Button
                    type="button"
                    onClick={() => startApproval(request)}
                    disabled={saving}
                  >
                    <Check className="size-4" />
                    Aprovar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void reject(request.id)}
                    disabled={saving}
                  >
                    <X className="size-4" />
                    Recusar
                  </Button>
                </div>
              </div>

              {activeRequestId === request.id && (
                <div className="space-y-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">
                    Defina o horário que será confirmado para o paciente.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Profissional
                      <select
                        className={inputClassName}
                        value={doctorId}
                        onChange={(event) => setDoctorId(event.target.value)}
                        required
                      >
                        <option value="">Selecione um profissional</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.user.name} — {doctor.specialty}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Data e hora
                      <input
                        className={inputClassName}
                        type="datetime-local"
                        lang="pt-BR"
                        value={startDatetime}
                        onChange={(event) =>
                          setStartDatetime(event.target.value)
                        }
                        required
                      />
                    </label>
                    <label className="space-y-1.5 text-sm font-medium text-slate-700">
                      Duração (minutos)
                      <input
                        className={inputClassName}
                        type="number"
                        min={1}
                        step={1}
                        value={durationMinutes}
                        onChange={(event) =>
                          setDurationMinutes(event.target.value)
                        }
                        required
                      />
                    </label>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveRequestId(null)}
                      disabled={saving}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void approve(request.id)}
                      disabled={saving}
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Check className="size-4" />
                      )}
                      Confirmar aprovação
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
