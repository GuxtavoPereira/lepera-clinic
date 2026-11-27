"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  CheckCircle2,
  Loader2,
} from "lucide-react";
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
type AvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};
type RoomOption = { id: string; name: string; location: string | null; isActive: boolean };

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TYPES = [
  { value: "SESSION", label: "Sessão de acompanhamento" },
  { value: "EVALUATION", label: "Avaliação psicológica / inicial" },
  { value: "RETURN", label: "Retorno" },
  { value: "CLOSURE", label: "Encerramento" },
] as const;

const STEPS = [
  { num: 1, title: "Paciente" },
  { num: 2, title: "Profissional" },
  { num: 3, title: "Data e sala" },
  { num: 4, title: "Confirmação" },
] as const;

export default function NewSessionPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);

  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("SESSION");
  const [durationMinutes, setDurationMinutes] = useState("50");
  const [startDatetime, setStartDatetime] = useState("");
  const [roomOrLink, setRoomOrLink] = useState("");
  const [allowOutside, setAllowOutside] = useState(false);
  const [receptionNotes, setReceptionNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      apiFetch<DoctorOption[]>("/doctors", { signal: controller.signal }),
      apiFetch<RoomOption[]>("/rooms", { signal: controller.signal }).catch(
        () => [] as RoomOption[],
      ),
    ])
      .then(([docs, rm]) => {
        if (controller.signal.aborted) return;
        setDoctors(docs);
        setRooms(rm.filter((r) => r.isActive));
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar os profissionais.",
          );
        }
      });
    return () => controller.abort();
  }, []);

  async function selectDoctor(id: string) {
    setDoctorId(id);
    setSlots(null);
    if (!id) return;
    try {
      setSlots(await apiFetch<AvailabilitySlot[]>(`/availability/doctor/${id}`));
    } catch {
      setSlots([]);
    }
  }

  const chosenDoctor = doctors.find((d) => d.id === doctorId) ?? null;

  function goNext() {
    setError(null);
    if (step === 1) {
      if (!patient) {
        setError("Selecione o paciente para continuar.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!doctorId) {
        setError("Selecione o profissional responsável pelo atendimento.");
        return;
      }
      const dur = Number(durationMinutes);
      if (!Number.isInteger(dur) || dur < 15 || dur > 240) {
        setError("Informe uma duração válida entre 15 e 240 minutos.");
        return;
      }
      setStep(3);
      return;
    }
    if (step === 3) {
      const parsed = new Date(startDatetime);
      if (!startDatetime || Number.isNaN(parsed.getTime())) {
        setError("Informe a data e o horário da sessão.");
        return;
      }
      if (allowOutside && receptionNotes.trim().length < 5) {
        setError(
          "Para encaixe fora da disponibilidade, informe uma justificativa com pelo menos 5 caracteres.",
        );
        return;
      }
      setStep(4);
    }
  }

  async function handleConfirm() {
    if (!patient || !doctorId || saving) return;
    setSaving(true);
    setError(null);
    try {
      const start = new Date(startDatetime).toISOString();
      const created = await apiFetch<{ id: string }>("/appointments", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          doctorId,
          startDatetime: start,
          durationMinutes: Number(durationMinutes),
          modality: "IN_PERSON",
          type,
          ...(roomOrLink.trim() ? { roomOrLink: roomOrLink.trim() } : {}),
          ...(receptionNotes.trim()
            ? { receptionNotes: receptionNotes.trim() }
            : {}),
          ...(allowOutside ? { allowOutsideAvailability: true } : {}),
        }),
      });
      setCreatedId(created.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível agendar a sessão. Revise os dados e tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  function resetWizard() {
    setStep(1);
    setPatient(null);
    setDoctorId("");
    setSlots(null);
    setStartDatetime("");
    setRoomOrLink("");
    setAllowOutside(false);
    setReceptionNotes("");
    setCreatedId(null);
    setError(null);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/reception/appointments"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para a agenda geral
        </Link>
        <Link
          href="/reception/appointments/new"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Abrir formulário rápido
        </Link>
      </div>

      <header className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarPlus className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Nova sessão (fluxo guiado)
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Agendamento presencial em 4 etapas: paciente, profissional, data/sala
            e confirmação.
          </p>
        </div>
      </header>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((item) => {
          const active = step === item.num && !createdId;
          const completed = Boolean(createdId) || step > item.num;
          return (
            <li
              key={item.num}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : completed
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                    : "border-border bg-card text-muted-foreground"
              }`}
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-bold">
                {completed ? <Check className="size-3" /> : item.num}
              </span>
              {item.title}
            </li>
          );
        })}
      </ol>

      {error && <Alert kind="error">{error}</Alert>}

      {createdId ? (
        <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="size-6 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-semibold">
                Sessão presencial agendada com sucesso
              </h2>
              <p className="text-sm opacity-90">
                {patient?.name} com {chosenDoctor?.user.name} em{" "}
                {formatDateTimePtBr(new Date(startDatetime).toISOString())}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={resetWizard}>Agendar outra sessão</Button>
            <Link
              href="/reception/calendar"
              className="inline-flex min-h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent"
            >
              Abrir calendário
            </Link>
            <Link
              href="/reception/appointments"
              className="inline-flex min-h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-accent"
            >
              Ver agenda geral
            </Link>
          </div>
        </section>
      ) : (
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {step === 1 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                1. Selecione o paciente
              </h2>
              <PatientPicker value={patient} onChange={setPatient} />
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                2. Escolha o profissional e o tipo de sessão
              </h2>
              <FormField id="ns-doctor" label="Profissional">
                <select
                  id="ns-doctor"
                  className={inputClassName}
                  value={doctorId}
                  onChange={(e) => void selectDoctor(e.target.value)}
                >
                  <option value="">Selecione um profissional</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user.name} — {d.specialty}
                    </option>
                  ))}
                </select>
              </FormField>
              {slots !== null && (
                <p className="rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs text-muted-foreground">
                  <strong>Disponibilidade recorrente:</strong>{" "}
                  {slots.length === 0
                    ? "Sem horários fixos cadastrados."
                    : slots
                        .map(
                          (s) =>
                            `${DAYS[s.dayOfWeek]} ${s.startTime}–${s.endTime}`,
                        )
                        .join(" · ")}
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="ns-type" label="Tipo de atendimento">
                  <select
                    id="ns-type"
                    className={inputClassName}
                    value={type}
                    onChange={(e) =>
                      setType(e.target.value as (typeof TYPES)[number]["value"])
                    }
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField id="ns-duration" label="Duração (minutos)">
                  <input
                    id="ns-duration"
                    type="number"
                    min={15}
                    max={240}
                    className={inputClassName}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">
                Modalidade: <strong>Presencial</strong> na clínica.
              </p>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                3. Defina data, horário e consultório
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField id="ns-datetime" label="Data e horário (Brasília)">
                  <input
                    id="ns-datetime"
                    type="datetime-local"
                    className={inputClassName}
                    value={startDatetime}
                    onChange={(e) => setStartDatetime(e.target.value)}
                  />
                </FormField>
                <FormField id="ns-room" label="Sala / consultório (opcional)">
                  <input
                    id="ns-room"
                    list="ns-room-list"
                    className={inputClassName}
                    placeholder="Ex.: Consultório 01"
                    value={roomOrLink}
                    onChange={(e) => setRoomOrLink(e.target.value)}
                  />
                  <datalist id="ns-room-list">
                    {rooms.map((r) => (
                      <option
                        key={r.id}
                        value={r.location ? `${r.name} (${r.location})` : r.name}
                      />
                    ))}
                  </datalist>
                </FormField>
              </div>

              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-border p-3.5 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-primary"
                  checked={allowOutside}
                  onChange={(e) => setAllowOutside(e.target.checked)}
                />
                <span>
                  <span className="font-medium text-foreground">
                    Encaixe fora da disponibilidade cadastrada
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Conflitos de horário com outras consultas continuam
                    bloqueados.
                  </span>
                </span>
              </label>

              <FormField
                id="ns-notes"
                label={
                  allowOutside
                    ? "Justificativa do encaixe *"
                    : "Observações da recepção (opcional)"
                }
              >
                <textarea
                  id="ns-notes"
                  rows={3}
                  maxLength={2000}
                  className={textareaClassName}
                  value={receptionNotes}
                  onChange={(e) => setReceptionNotes(e.target.value)}
                />
              </FormField>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">
                4. Revise e confirme o agendamento
              </h2>
              <dl className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Paciente</dt>
                  <dd className="font-medium text-foreground">
                    {patient?.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Profissional</dt>
                  <dd className="font-medium text-foreground">
                    {chosenDoctor?.user.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Data e hora</dt>
                  <dd className="font-medium text-foreground">
                    {startDatetime
                      ? formatDateTimePtBr(new Date(startDatetime).toISOString())
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Tipo / duração / modalidade
                  </dt>
                  <dd className="font-medium text-foreground">
                    {TYPES.find((t) => t.value === type)?.label} ·{" "}
                    {durationMinutes} min · Presencial
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Sala / consultório
                  </dt>
                  <dd className="font-medium text-foreground">
                    {roomOrLink.trim() || "A definir na recepção"}
                  </dd>
                </div>
                {receptionNotes.trim() && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">
                      Observações
                    </dt>
                    <dd className="whitespace-pre-wrap text-foreground">
                      {receptionNotes.trim()}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={step === 1 || saving}
              onClick={() => {
                setError(null);
                setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4);
              }}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>

            {step < 4 ? (
              <Button type="button" className="min-h-11" onClick={goNext}>
                Continuar
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="min-h-11"
                disabled={saving}
                onClick={() => void handleConfirm()}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Confirmar sessão presencial
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
