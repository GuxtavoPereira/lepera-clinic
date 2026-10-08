"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";

type DoctorOption = {
  id: string;
  specialty: string;
  user: { name: string };
};

type ScheduleRequest = {
  id: string;
  type: string;
  preferredDate: string | null;
  preferredShift: string | null;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  preferredDoctor: { user: { name: string } } | null;
  generatedAppointment: {
    startDatetime: string;
    endDatetime: string;
    status: string;
  } | null;
};

const inputClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";

const statusLabels: Record<ScheduleRequest["status"], string> = {
  PENDING: "Aguardando análise",
  APPROVED: "Aprovada",
  REJECTED: "Não aprovada",
};

function formatDate(value: string) {
  return formatDateTimePtBr(value);
}

export default function RequestAppointmentPage() {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [preferredDoctorId, setPreferredDoctorId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredShift, setPreferredShift] = useState("INDIFFERENT");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function fetchPage() {
    return Promise.all([
      apiFetch<DoctorOption[]>("/doctors"),
      apiFetch<ScheduleRequest[]>("/schedule-requests/mine"),
    ]);
  }

  async function loadPage() {
    try {
      const [availableDoctors, ownRequests] = await fetchPage();
      setDoctors(availableDoctors);
      setRequests(ownRequests);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os dados. Verifique a conexão com a API.",
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    void fetchPage()
      .then(([availableDoctors, ownRequests]) => {
        if (!active) return;
        setDoctors(availableDoctors);
        setRequests(ownRequests);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar os dados. Verifique a conexão com a API.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      await apiFetch<ScheduleRequest>("/schedule-requests", {
        method: "POST",
        body: JSON.stringify({
          type: "novo_paciente",
          ...(preferredDoctorId ? { preferredDoctorId } : {}),
          ...(preferredDate ? { preferredDate } : {}),
          preferredShift,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      setPreferredDoctorId("");
      setPreferredDate("");
      setPreferredShift("INDIFFERENT");
      setReason("");
      setSuccess("Solicitação enviada para análise da recepção.");
      await loadPage();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível enviar sua solicitação.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <CalendarPlus className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Solicitar agendamento
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Informe suas preferências. A recepção confirmará o horário ou
              entrará em contato.
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="preferredDoctorId"
            >
              Profissional de preferência
            </label>
            <select
              id="preferredDoctorId"
              className={inputClassName}
              value={preferredDoctorId}
              onChange={(event) => setPreferredDoctorId(event.target.value)}
            >
              <option value="">Sem preferência</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.name} — {doctor.specialty}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="preferredDate"
            >
              Data de preferência
            </label>
            <input
              id="preferredDate"
              className={inputClassName}
              type="date"
              lang="pt-BR"
              min={new Date().toLocaleDateString("en-CA")}
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="preferredShift"
            >
              Turno de preferência
            </label>
            <select
              id="preferredShift"
              className={inputClassName}
              value={preferredShift}
              onChange={(event) => setPreferredShift(event.target.value)}
            >
              <option value="INDIFFERENT">Qualquer turno</option>
              <option value="MORNING">Manhã</option>
              <option value="AFTERNOON">Tarde</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="reason"
            >
              Observação para a recepção{" "}
              <span className="font-normal text-slate-400">— opcional</span>
            </label>
            <textarea
              id="reason"
              className={`${inputClassName} h-24 resize-y py-2`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Conte brevemente o motivo da solicitação ou alguma preferência"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {success}
          </p>
        )}
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <Button type="submit" disabled={sending}>
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            {sending ? "Enviando..." : "Enviar solicitação"}
          </Button>
        </div>
      </form>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Minhas solicitações
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe a análise e os horários confirmados pela recepção.
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando solicitações...</p>
        ) : requests.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            Você ainda não enviou solicitações de agendamento.
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-slate-900">
                    Pedido de agendamento
                    {request.preferredDoctor &&
                      ` · ${request.preferredDoctor.user.name}`}
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
                  {request.generatedAppointment && (
                    <p className="font-medium text-teal-800">
                      Horário confirmado:{" "}
                      {formatDate(request.generatedAppointment.startDatetime)}
                    </p>
                  )}
                  <p className="text-xs text-slate-400">
                    Enviada em {formatDate(request.createdAt)}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                    request.status === "PENDING"
                      ? "bg-amber-50 text-amber-800"
                      : request.status === "APPROVED"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {statusLabels[request.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
