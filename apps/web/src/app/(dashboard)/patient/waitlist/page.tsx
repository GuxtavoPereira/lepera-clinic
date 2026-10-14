"use client";

import { useEffect, useState } from "react";
import { ListTodo, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type DoctorOption = { id: string; specialty: string; user: { name: string } };

type Entry = {
  id: string;
  status: "waiting" | "notified" | "scheduled" | "gave_up";
  preferredShift: "MORNING" | "AFTERNOON" | "INDIFFERENT" | null;
  reason: string | null;
  enteredAt: string;
  preferredDoctor: { user: { name: string } } | null;
};

const STATUS: Record<Entry["status"], { label: string; className: string }> = {
  waiting: { label: "Aguardando vaga", className: "bg-amber-50 text-amber-800" },
  notified: {
    label: "Vaga liberada — solicite o agendamento",
    className: "bg-emerald-50 text-emerald-800",
  },
  scheduled: { label: "Agendado", className: "bg-slate-100 text-slate-700" },
  gave_up: { label: "Você saiu da lista", className: "bg-slate-100 text-slate-600" },
};

const SHIFT_LABEL = {
  MORNING: "manhã",
  AFTERNOON: "tarde",
  INDIFFERENT: "qualquer turno",
} as const;

export default function PatientWaitlistPage() {
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [shift, setShift] = useState("INDIFFERENT");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function fetchPage() {
    return Promise.all([
      apiFetch<DoctorOption[]>("/doctors"),
      apiFetch<Entry[]>("/waitlist/mine"),
    ]);
  }

  async function reload() {
    try {
      const [, mine] = await fetchPage();
      setEntries(mine);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível atualizar a lista.",
      );
    }
  }

  useEffect(() => {
    let active = true;
    void fetchPage()
      .then(([availableDoctors, mine]) => {
        if (!active) return;
        setDoctors(availableDoctors);
        setEntries(mine);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Não foi possível carregar os dados.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/waitlist", {
        method: "POST",
        body: JSON.stringify({
          ...(doctorId ? { preferredDoctorId: doctorId } : {}),
          preferredShift: shift,
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      setDoctorId("");
      setReason("");
      setNotice(
        "Você entrou na lista de espera. Avisaremos pelas notificações quando abrir uma vaga.",
      );
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível entrar na lista.",
      );
    } finally {
      setSending(false);
    }
  }

  async function leave(id: string) {
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/waitlist/${id}/leave`, { method: "PATCH" });
      await reload();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível sair da lista.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <ListTodo className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Lista de espera
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sem horário disponível? Entre na lista e seja avisado quando alguém
            desmarcar.
          </p>
        </div>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="doctor" label="Profissional">
            <select
              id="doctor"
              className={inputClassName}
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
            >
              <option value="">Qualquer profissional</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.user.name} — {doctor.specialty}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="shift" label="Turno">
            <select
              id="shift"
              className={inputClassName}
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <option value="INDIFFERENT">Qualquer turno</option>
              <option value="MORNING">Manhã</option>
              <option value="AFTERNOON">Tarde</option>
            </select>
          </FormField>
        </div>
        <FormField id="reason" label="Observação (opcional)">
          <textarea
            id="reason"
            className={textareaClassName}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <Button type="submit" disabled={sending}>
            {sending && <Loader2 className="size-4 animate-spin" />}
            Entrar na lista de espera
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Meus pedidos</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
            Você não está em nenhuma lista de espera.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => {
              const active = entry.status === "waiting" || entry.status === "notified";
              return (
                <li
                  key={entry.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
                >
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-slate-900">
                      {entry.preferredDoctor?.user.name ?? "Qualquer profissional"}
                      {entry.preferredShift &&
                        ` · ${SHIFT_LABEL[entry.preferredShift]}`}
                    </p>
                    <p className="text-xs text-slate-400">
                      Desde {formatDateTimePtBr(entry.enteredAt)}
                    </p>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS[entry.status].className}`}
                    >
                      {STATUS[entry.status].label}
                    </span>
                  </div>
                  {active && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void leave(entry.id)}
                    >
                      <LogOut className="size-3.5" />
                      Sair da lista
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
