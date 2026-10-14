"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import {
  PatientPicker,
  type PickedPatient,
} from "@/components/patients/patient-picker";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type DoctorOption = { id: string; specialty: string; user: { name: string } };
type Slot = { id: string; dayOfWeek: number; startTime: string; endTime: string };

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function describeSlots(slots: Slot[]) {
  if (slots.length === 0) {
    return "Sem horários cadastrados (o sistema não restringe).";
  }
  return slots
    .map((slot) => `${DAYS[slot.dayOfWeek]} ${slot.startTime}–${slot.endTime}`)
    .join(" · ");
}

export default function NewAppointmentPage() {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [startDatetime, setStartDatetime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("50");
  const [modality, setModality] = useState<"IN_PERSON" | "ONLINE">("IN_PERSON");
  const [type, setType] = useState("SESSION");
  const [roomOrLink, setRoomOrLink] = useState("");
  const [receptionNotes, setReceptionNotes] = useState("");
  const [allowOutside, setAllowOutside] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void apiFetch<DoctorOption[]>("/doctors")
      .then((result) => {
        if (active) setDoctors(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar os profissionais.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  async function chooseDoctor(id: string) {
    setDoctorId(id);
    setSlots(null);
    if (!id) return;
    try {
      setSlots(await apiFetch<Slot[]>(`/availability/doctor/${id}`));
    } catch {
      setSlots([]);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!patient) {
      setError("Escolha o paciente.");
      return;
    }
    if (!doctorId) {
      setError("Escolha o profissional.");
      return;
    }

    setSaving(true);
    setError(null);
    setCreatedAt(null);
    try {
      const start = new Date(startDatetime).toISOString();
      await apiFetch("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          doctorId,
          startDatetime: start,
          durationMinutes: Number(durationMinutes),
          modality,
          type,
          ...(roomOrLink.trim() ? { roomOrLink: roomOrLink.trim() } : {}),
          ...(receptionNotes.trim()
            ? { receptionNotes: receptionNotes.trim() }
            : {}),
          ...(allowOutside ? { allowOutsideAvailability: true } : {}),
        }),
      });
      setCreatedAt(start);
      setPatient(null);
      setStartDatetime("");
      setRoomOrLink("");
      setReceptionNotes("");
      setAllowOutside(false);
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
              Novo agendamento
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Marque uma consulta para um paciente. O horário precisa caber na
              disponibilidade do profissional, a menos que seja um encaixe.
            </p>
          </div>
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {createdAt && (
        <Alert kind="success">
          Consulta agendada para {formatDateTimePtBr(createdAt)}.
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-slate-700">Paciente</p>
            <PatientPicker value={patient} onChange={setPatient} />
          </div>

          <FormField
            id="doctorId"
            label="Profissional"
            hint={slots ? `Atende: ${describeSlots(slots)}` : undefined}
          >
            <select
              id="doctorId"
              className={inputClassName}
              value={doctorId}
              onChange={(e) => void chooseDoctor(e.target.value)}
              required
            >
              <option value="">Selecione um profissional</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.name} — {doctor.specialty}
                </option>
              ))}
            </select>
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="startDatetime" label="Data e hora de início">
              <input
                id="startDatetime"
                type="datetime-local"
                lang="pt-BR"
                className={inputClassName}
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                required
              />
            </FormField>
            <FormField id="durationMinutes" label="Duração (minutos)">
              <input
                id="durationMinutes"
                type="number"
                min={1}
                step={1}
                className={inputClassName}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                required
              />
            </FormField>
            <FormField id="modality" label="Modalidade">
              <select
                id="modality"
                className={inputClassName}
                value={modality}
                onChange={(e) =>
                  setModality(e.target.value as "IN_PERSON" | "ONLINE")
                }
              >
                <option value="IN_PERSON">Presencial</option>
                <option value="ONLINE">Online</option>
              </select>
            </FormField>
            <FormField id="type" label="Tipo de consulta">
              <select
                id="type"
                className={inputClassName}
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="SESSION">Sessão</option>
                <option value="EVALUATION">Avaliação</option>
                <option value="RETURN">Retorno</option>
                <option value="CLOSURE">Encerramento</option>
              </select>
            </FormField>
          </div>

          <FormField id="roomOrLink" label="Sala ou link (opcional)">
            <input
              id="roomOrLink"
              className={inputClassName}
              value={roomOrLink}
              onChange={(e) => setRoomOrLink(e.target.value)}
              placeholder="Ex.: Sala 2 ou link da videochamada"
            />
          </FormField>

          <FormField id="receptionNotes" label="Notas da recepção (opcional)">
            <textarea
              id="receptionNotes"
              className={textareaClassName}
              value={receptionNotes}
              onChange={(e) => setReceptionNotes(e.target.value)}
            />
          </FormField>

          <label className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-slate-300"
              checked={allowOutside}
              onChange={(e) => setAllowOutside(e.target.checked)}
            />
            <span>
              <strong className="font-medium text-slate-800">Encaixe:</strong>{" "}
              permitir marcar fora do horário de atendimento do profissional.
              Conflitos com outras consultas continuam bloqueados.
            </span>
          </label>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-5">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            {saving ? "Agendando..." : "Agendar consulta"}
          </Button>
        </div>
      </form>
    </div>
  );
}
