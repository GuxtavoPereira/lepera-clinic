"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, inputClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";

type ApiSlot = { id: string; dayOfWeek: number; startTime: string; endTime: string };
type Slot = { key: string; dayOfWeek: number; startTime: string; endTime: string };

const DAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];
// Segunda a domingo na tela
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export default function DoctorAvailabilityPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const counter = useRef(0);

  function fromApi(list: ApiSlot[]): Slot[] {
    return list.map((slot) => ({
      key: slot.id,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));
  }

  useEffect(() => {
    let active = true;
    void apiFetch<ApiSlot[]>("/availability/mine")
      .then((result) => {
        if (active) setSlots(fromApi(result));
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar a disponibilidade.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function addSlot(dayOfWeek: number) {
    counter.current += 1;
    setSlots((current) => [
      ...current,
      {
        key: `new-${counter.current}`,
        dayOfWeek,
        startTime: "08:00",
        endTime: "12:00",
      },
    ]);
    setNotice(null);
  }

  function updateSlot(key: string, patch: Partial<Slot>) {
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...patch } : slot)),
    );
    setNotice(null);
  }

  function removeSlot(key: string) {
    setSlots((current) => current.filter((slot) => slot.key !== key));
    setNotice(null);
  }

  async function handleSave() {
    for (const slot of slots) {
      if (!slot.startTime || !slot.endTime) {
        setError("Preencha o início e o fim de todos os horários.");
        return;
      }
      if (toMinutes(slot.startTime) >= toMinutes(slot.endTime)) {
        setError(
          `Em ${DAYS[slot.dayOfWeek]}, o horário final precisa ser depois do inicial.`,
        );
        return;
      }
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await apiFetch<ApiSlot[]>("/availability/mine", {
        method: "PUT",
        body: JSON.stringify({
          slots: slots.map(({ dayOfWeek, startTime, endTime }) => ({
            dayOfWeek,
            startTime,
            endTime,
          })),
        }),
      });
      setSlots(fromApi(saved));
      setNotice("Disponibilidade salva.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Clock className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Disponibilidade
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Seus horários de atendimento na semana. Os agendamentos só podem ser
            feitos dentro deles.
          </p>
        </div>
      </header>

      {!loading && slots.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Você ainda não cadastrou horários: neste caso o sistema{" "}
          <strong>não restringe</strong> os agendamentos. Cadastre para evitar
          consultas fora do seu expediente.
        </p>
      )}

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {DAY_ORDER.map((day) => {
            const daySlots = slots.filter((slot) => slot.dayOfWeek === day);
            return (
              <div
                key={day}
                className="flex flex-col gap-2 border-b border-slate-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-start"
              >
                <p className="w-40 shrink-0 pt-2 text-sm font-medium text-slate-700">
                  {DAYS[day]}
                </p>
                <div className="flex-1 space-y-2">
                  {daySlots.length === 0 && (
                    <p className="pt-2 text-sm text-slate-400">Não atende</p>
                  )}
                  {daySlots.map((slot) => (
                    <div key={slot.key} className="flex items-center gap-2">
                      <input
                        type="time"
                        aria-label={`Início, ${DAYS[day]}`}
                        className={`${inputClassName} w-32`}
                        value={slot.startTime}
                        onChange={(e) =>
                          updateSlot(slot.key, { startTime: e.target.value })
                        }
                      />
                      <span className="text-slate-400">até</span>
                      <input
                        type="time"
                        aria-label={`Fim, ${DAYS[day]}`}
                        className={`${inputClassName} w-32`}
                        value={slot.endTime}
                        onChange={(e) =>
                          updateSlot(slot.key, { endTime: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        aria-label="Remover horário"
                        onClick={() => removeSlot(slot.key)}
                        className="rounded-md p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addSlot(day)}
                  >
                    <Plus className="size-3.5" />
                    Adicionar horário
                  </Button>
                </div>
              </div>
            );
          })}

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar disponibilidade
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
