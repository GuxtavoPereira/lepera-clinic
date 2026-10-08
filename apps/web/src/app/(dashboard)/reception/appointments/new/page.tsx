"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";

type CreatedAppointment = {
  id: string;
  patientId: string;
  doctorId: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes: number;
  status: string;
};

const fieldClassName =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15";
const labelClassName = "text-sm font-medium text-slate-700";

export default function NewAppointmentPage() {
  const user = useCurrentUser();
  const [patientId, setPatientId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [startDatetime, setStartDatetime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("50");
  const [modality, setModality] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [type, setType] = useState("SESSION");
  const [roomOrLink, setRoomOrLink] = useState("");
  const [receptionNotes, setReceptionNotes] = useState("");
  const [created, setCreated] = useState<CreatedAppointment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canCreate = user?.role === "ADMIN" || user?.role === "RECEPTIONIST";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setCreated(null);

    try {
      const result = await apiFetch<CreatedAppointment>("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: patientId.trim(),
          doctorId: doctorId.trim(),
          startDatetime: new Date(startDatetime).toISOString(),
          durationMinutes: Number(durationMinutes),
          modality,
          type,
          ...(roomOrLink.trim() ? { roomOrLink: roomOrLink.trim() } : {}),
          ...(receptionNotes.trim()
            ? { receptionNotes: receptionNotes.trim() }
            : {}),
        }),
      });
      setCreated(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível conectar à API. Verifique se ela está rodando.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/reception/appointments"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar para agenda geral
        </Link>
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <CalendarPlus className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Testar cadastro de agendamento
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Envia uma requisição real para{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                POST /api/appointments
              </code>{" "}
              usando sua sessão atual.
            </p>
          </div>
        </div>
      </div>

      {!user && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Entre no sistema com um perfil de administração ou recepção para
          chamar esta rota.{" "}
          <Link className="font-semibold underline" href="/auth/login">
            Ir para o login
          </Link>
        </div>
      )}

      {user && !canCreate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          A rota permite apenas os perfis Administração e Recepção. Seu perfil
          atual não tem permissão para criar agendamentos.
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="patientId">
              ID do paciente
            </label>
            <input
              id="patientId"
              className={fieldClassName}
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
              placeholder="UUID do paciente"
              required
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="doctorId">
              ID do profissional
            </label>
            <input
              id="doctorId"
              className={fieldClassName}
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              placeholder="UUID do profissional"
              required
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="startDatetime">
              Data e hora de início
            </label>
            <input
              id="startDatetime"
              className={fieldClassName}
              type="datetime-local"
              lang="pt-BR"
              value={startDatetime}
              onChange={(event) => setStartDatetime(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="durationMinutes">
              Duração (minutos)
            </label>
            <input
              id="durationMinutes"
              className={fieldClassName}
              type="number"
              min={1}
              step={1}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="modality">
              Modalidade
            </label>
            <select
              id="modality"
              className={fieldClassName}
              value={modality}
              onChange={(event) =>
                setModality(event.target.value as "IN_PERSON" | "ONLINE")
              }
            >
              <option value="IN_PERSON">Presencial</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className={labelClassName} htmlFor="type">
              Tipo de consulta
            </label>
            <select
              id="type"
              className={fieldClassName}
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="SESSION">Sessão</option>
              <option value="EVALUATION">Avaliação</option>
              <option value="RETURN">Retorno</option>
              <option value="CLOSURE">Encerramento</option>
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className={labelClassName} htmlFor="roomOrLink">
              Sala ou link <span className="font-normal text-slate-400">— opcional</span>
            </label>
            <input
              id="roomOrLink"
              className={fieldClassName}
              value={roomOrLink}
              onChange={(event) => setRoomOrLink(event.target.value)}
              placeholder="Ex.: Sala 2 ou link da videochamada"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className={labelClassName} htmlFor="receptionNotes">
              Notas da recepção <span className="font-normal text-slate-400">— opcional</span>
            </label>
            <textarea
              id="receptionNotes"
              className={`${fieldClassName} h-24 resize-y py-2`}
              value={receptionNotes}
              onChange={(event) => setReceptionNotes(event.target.value)}
              placeholder="Observações sobre este agendamento"
            />
          </div>
        </div>

        <p className="text-xs leading-5 text-slate-500">
          Os IDs podem ser consultados nas respostas de{" "}
          <code>GET /api/patients</code> e <code>GET /api/doctors</code> no
          Thunder Client. A consulta de profissionais atualmente exige perfil
          Administração.
        </p>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {created && (
          <div
            role="status"
            className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
          >
            <p className="text-sm font-semibold text-emerald-900">
              Agendamento criado com sucesso.
            </p>
            <pre className="overflow-x-auto rounded-lg bg-white/80 p-3 text-xs text-slate-700">
              {JSON.stringify(created, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <Button type="submit" disabled={!canCreate || saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            {saving ? "Enviando..." : "Enviar para a API"}
          </Button>
        </div>
      </form>
    </div>
  );
}
