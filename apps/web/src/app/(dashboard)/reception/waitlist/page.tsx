"use client";

import { useEffect, useState } from "react";
import { Check, ListTodo, Loader2, Plus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  FormField,
  inputClassName,
} from "@/components/forms/form-field";
import {
  PatientPicker,
  type PickedPatient,
} from "@/components/patients/patient-picker";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type Priority = "HIGH" | "MEDIUM" | "LOW";
type Shift = "MORNING" | "AFTERNOON" | "INDIFFERENT";

type Entry = {
  id: string;
  status: "waiting" | "notified";
  priority: Priority;
  preferredShift: Shift | null;
  reason: string | null;
  enteredAt: string;
  patient: { id: string; user: { name: string; email: string } };
  preferredDoctor: { user: { name: string } } | null;
};

type DoctorOption = { id: string; specialty: string; user: { name: string } };

const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};
const PRIORITY_CLASS: Record<Priority, string> = {
  HIGH: "bg-red-50 text-red-800",
  MEDIUM: "bg-amber-50 text-amber-800",
  LOW: "bg-slate-100 text-slate-700",
};
const SHIFT_LABEL: Record<Shift, string> = {
  MORNING: "manhã",
  AFTERNOON: "tarde",
  INDIFFERENT: "qualquer turno",
};

export default function ReceptionWaitlistPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [patient, setPatient] = useState<PickedPatient | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [shift, setShift] = useState<Shift>("INDIFFERENT");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [reason, setReason] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<Entry[]>("/waitlist"),
      apiFetch<DoctorOption[]>("/doctors"),
    ])
      .then(([list, availableDoctors]) => {
        if (!active) return;
        setEntries(list);
        setDoctors(availableDoctors);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar a lista de espera.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  function reload() {
    setReloadKey((key) => key + 1);
  }

  async function patchEntry(
    id: string,
    body: { status?: "waiting" | "scheduled" | "gave_up"; priority?: Priority },
  ) {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/waitlist/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      reload();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível atualizar o pedido.",
      );
    }
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!patient) {
      setError("Escolha o paciente.");
      return;
    }

    setAdding(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/waitlist", {
        method: "POST",
        body: JSON.stringify({
          patientId: patient.id,
          ...(doctorId ? { preferredDoctorId: doctorId } : {}),
          preferredShift: shift,
          priority,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      setPatient(null);
      setDoctorId("");
      setReason("");
      setNotice("Paciente adicionado à lista de espera.");
      reload();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível adicionar.",
      );
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <ListTodo className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Lista de espera
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Quando uma consulta é cancelada, os primeiros da fila que combinam
            com a vaga (profissional e turno) são avisados automaticamente.
          </p>
        </div>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <form
        onSubmit={handleAdd}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          Adicionar paciente
        </h2>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-slate-700">Paciente</p>
          <PatientPicker value={patient} onChange={setPatient} />
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <FormField id="w-doctor" label="Profissional">
            <select
              id="w-doctor"
              className={inputClassName}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Qualquer</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="w-shift" label="Turno">
            <select
              id="w-shift"
              className={inputClassName}
              value={shift}
              onChange={(e) => setShift(e.target.value as Shift)}
            >
              <option value="INDIFFERENT">Qualquer</option>
              <option value="MORNING">Manhã</option>
              <option value="AFTERNOON">Tarde</option>
            </select>
          </FormField>
          <FormField id="w-priority" label="Prioridade">
            <select
              id="w-priority"
              className={inputClassName}
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>
          </FormField>
        </div>
        <FormField id="w-reason" label="Observação (opcional)">
          <input
            id="w-reason"
            className={inputClassName}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={adding}>
            {adding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Adicionar à lista
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Fila atual
          {entries.length > 0 && (
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
              {entries.length}
            </span>
          )}
        </h2>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Ninguém na lista de espera.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-slate-900">
                      {entry.patient.user.name}
                    </p>
                    <p className="text-slate-500">{entry.patient.user.email}</p>
                    <p className="text-slate-600">
                      {entry.preferredDoctor?.user.name ?? "Qualquer profissional"}
                      {entry.preferredShift &&
                        ` · ${SHIFT_LABEL[entry.preferredShift]}`}
                    </p>
                    {entry.reason && (
                      <p className="text-slate-500">Obs.: {entry.reason}</p>
                    )}
                    <p className="text-xs text-slate-400">
                      Na fila desde {formatDateTimePtBr(entry.enteredAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        entry.status === "notified"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {entry.status === "notified" ? "Avisado" : "Aguardando"}
                    </span>
                    <select
                      aria-label="Prioridade"
                      className={`h-8 rounded-lg border border-slate-200 px-2 text-xs font-medium ${PRIORITY_CLASS[entry.priority]}`}
                      value={entry.priority}
                      onChange={(e) =>
                        void patchEntry(entry.id, {
                          priority: e.target.value as Priority,
                        })
                      }
                    >
                      {(Object.keys(PRIORITY_LABEL) as Priority[]).map((value) => (
                        <option key={value} value={value}>
                          Prioridade {PRIORITY_LABEL[value].toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void patchEntry(entry.id, { status: "scheduled" })}
                  >
                    <Check className="size-3.5" />
                    Marcar como agendado
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void patchEntry(entry.id, { status: "gave_up" })}
                  >
                    <X className="size-3.5" />
                    Desistiu
                  </Button>
                  {entry.status === "notified" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void patchEntry(entry.id, { status: "waiting" })}
                    >
                      <RotateCcw className="size-3.5" />
                      Voltar para aguardando
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
