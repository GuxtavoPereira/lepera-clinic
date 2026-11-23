"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { CalendarClock, Loader2, RefreshCw } from "lucide-react";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ApiError, apiFetch } from "@/lib/api-client";
import {
  calendarDateKey,
  calendarShiftDate,
  calendarTimeLabel,
  type CalendarSlot,
} from "@/lib/calendar";
import { formatDateTimePtBr } from "@/lib/date-format";

export type ReschedulableAppointment = {
  id: string;
  doctorId: string;
  startDatetime: string;
  durationMinutes: number;
  updatedAt: string;
  modality: "IN_PERSON" | "ONLINE";
  patient: { user: { name: string } };
  doctor: { user: { name: string } };
};

export type RescheduledAppointment = { id: string; startDatetime: string };

export function RescheduleAppointmentButton({
  appointment,
  onRescheduled,
  onRefresh,
}: {
  appointment: ReschedulableAppointment;
  onRescheduled: (result: RescheduledAppointment) => void;
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (appointment.modality === "ONLINE") return <p className="max-w-sm text-sm text-muted-foreground">Registro online anterior: combine com o paciente o cancelamento e um novo agendamento presencial.</p>;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!saving) setOpen(next);
      }}
    >
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
          />
        }
      >
        <CalendarClock aria-hidden="true" className="size-4" /> Remarcar
      </SheetTrigger>
      <SheetContent
        showCloseButton={!saving}
        className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        <SheetHeader className="px-5 pt-6 pr-14">
          <SheetTitle className="text-xl">Remarcar consulta</SheetTitle>
          <SheetDescription>
            Escolha o novo horário e confira os dados antes de confirmar.
          </SheetDescription>
        </SheetHeader>
        {open && (
          <RescheduleForm
            appointment={appointment}
            saving={saving}
            setSaving={setSaving}
            onClose={() => setOpen(false)}
            onRefresh={() => {
              setOpen(false);
              onRefresh();
            }}
            onSaved={(result) => {
              setOpen(false);
              onRescheduled(result);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function RescheduleForm({
  appointment,
  saving,
  setSaving,
  onClose,
  onSaved,
  onRefresh,
}: {
  appointment: ReschedulableAppointment;
  saving: boolean;
  setSaving: (value: boolean) => void;
  onClose: () => void;
  onSaved: (result: RescheduledAppointment) => void;
  onRefresh: () => void;
}) {
  const id = useId();
  const [day, setDay] = useState(() =>
    calendarDateKey(appointment.startDatetime),
  );
  const [selectedStart, setSelectedStart] = useState("");
  const [manual, setManual] = useState(false);
  const [time, setTime] = useState("");
  const [outsideAvailability, setOutsideAvailability] = useState(false);
  const [reason, setReason] = useState("");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items: CalendarSlot[];
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reasonError, setReasonError] = useState<string>();
  const [timeError, setTimeError] = useState<string>();
  const [dayError, setDayError] = useState<string>();
  const dayInput = useRef<HTMLInputElement>(null);
  const reasonInput = useRef<HTMLTextAreaElement>(null);
  const timeInput = useRef<HTMLInputElement>(null);
  const slotInput = useRef<HTMLSelectElement>(null);
  const submitting = useRef(false);
  const requestKey = `${day}:${retry}`;
  const currentResult = result?.key === requestKey ? result : null;
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(day);
  const slotsLoading = validDay && !currentResult;

  useEffect(() => {
    if (!validDay || manual) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      from: day,
      to: calendarShiftDate(day, 1),
      doctorId: appointment.doctorId,
    });
    void apiFetch<{ items: CalendarSlot[] }>(
      `/appointments/available-slots?${params}`,
      { signal: controller.signal },
    )
      .then(({ items }) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, items });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            items: [],
            error:
              err instanceof ApiError
                ? err.message
                : "Não foi possível consultar os horários. Tente novamente.",
          });
      });
    return () => controller.abort();
  }, [appointment.doctorId, day, manual, requestKey, validDay]);

  // Brasília is explicitly used here, independent of the device's time zone.
  const manualDate =
    validDay && /^\d{2}:\d{2}$/.test(time)
      ? new Date(`${day}T${time}:00-03:00`)
      : null;
  const manualStart =
    manualDate &&
    Number.isFinite(manualDate.getTime()) &&
    calendarDateKey(manualDate) === day &&
    calendarTimeLabel(manualDate) === time
      ? manualDate.toISOString()
      : "";
  const start = manual ? manualStart : selectedStart;
  const available = currentResult?.items ?? [];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    setConflict(false);
    setTimeError(undefined);
    setDayError(undefined);
    setReasonError(undefined);
    if (!validDay) {
      setDayError("Escolha o dia da nova consulta.");
      dayInput.current?.focus();
      return;
    }
    if (
      !start ||
      Date.parse(start) <= Date.now() ||
      Date.parse(start) === Date.parse(appointment.startDatetime) ||
      (!manual && !available.some((slot) => slot.start === start))
    ) {
      setTimeError("Escolha um horário futuro diferente do horário atual.");
      (manual ? timeInput.current : slotInput.current)?.focus();
      return;
    }
    if (reason.trim().length < 5) {
      setReasonError("Informe o motivo com pelo menos 5 caracteres.");
      reasonInput.current?.focus();
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      const updated = await apiFetch<RescheduledAppointment>(
        `/appointments/${encodeURIComponent(appointment.id)}/reschedule`,
        {
          method: "PATCH",
          body: JSON.stringify({
            startDatetime: start,
            reason: reason.trim(),
            expectedUpdatedAt: appointment.updatedAt,
            ...(manual && outsideAvailability
              ? { allowOutsideAvailability: true }
              : {}),
          }),
        },
      );
      onSaved(updated);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível confirmar a remarcação. Confira a conexão e tente novamente.",
      );
      if (err instanceof ApiError && err.status === 409) {
        setConflict(true);
        setSelectedStart("");
        setRetry((value) => value + 1);
      }
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5 px-5 pb-6" onSubmit={submit} noValidate>
      <div className="space-y-1 rounded-xl border border-border bg-muted/50 p-4 text-sm">
        <p className="font-semibold">{appointment.patient.user.name}</p>
        <p className="text-muted-foreground">{appointment.doctor.user.name}</p>
        <p>Horário atual · {formatDateTimePtBr(appointment.startDatetime)}</p>
        <p className="text-muted-foreground">
          {appointment.durationMinutes} minutos ·{" "}
          {appointment.modality === "ONLINE" ? "Online (registro anterior)" : "Presencial"}
        </p>
      </div>
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <FormField
          id={`${id}-day`}
          label="Novo dia"
          hint="Todos os horários são de Brasília (UTC−3)."
          error={dayError}
        >
          <input
            ref={dayInput}
            id={`${id}-day`}
            type="date"
            className={inputClassName}
            value={day}
            min={calendarDateKey(new Date())}
            aria-invalid={Boolean(dayError)}
            aria-describedby={`${id}-day-hint${dayError ? ` ${id}-day-error` : ""}`}
            onChange={(event) => {
              setDay(event.target.value);
              setSelectedStart("");
              setTimeError(undefined);
              setDayError(undefined);
            }}
          />
        </FormField>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={manual}
            onChange={(event) => {
              setManual(event.target.checked);
              setSelectedStart("");
              setOutsideAvailability(false);
              setTimeError(undefined);
            }}
          />
          Informar outro horário
        </label>
        {manual ? (
          <>
            <FormField id={`${id}-time`} label="Novo horário" error={timeError}>
              <input
                ref={timeInput}
                id={`${id}-time`}
                type="time"
                className={inputClassName}
                value={time}
                aria-invalid={Boolean(timeError)}
                aria-describedby={timeError ? `${id}-time-error` : undefined}
                onChange={(event) => {
                  setTime(event.target.value);
                  setTimeError(undefined);
                }}
              />
            </FormField>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-primary"
                checked={outsideAvailability}
                onChange={(event) =>
                  setOutsideAvailability(event.target.checked)
                }
              />
              <span>
                Autorizar encaixe fora da disponibilidade. O motivo abaixo
                também justifica o encaixe. Conflitos com outras consultas
                continuam bloqueados.
              </span>
            </label>
          </>
        ) : (
          <FormField
            id={`${id}-slot`}
            label="Horários livres"
            error={timeError}
            hint={
              appointment.durationMinutes !== 50
                ? `As sugestões mostram intervalos livres de 50 minutos. Sua consulta mantém ${appointment.durationMinutes} minutos; todo o período será conferido ao confirmar.`
                : "A disponibilidade será conferida novamente ao confirmar."
            }
          >
            <select
              ref={slotInput}
              id={`${id}-slot`}
              className={inputClassName}
              value={selectedStart}
              disabled={
                slotsLoading || !validDay || Boolean(currentResult?.error)
              }
              aria-invalid={Boolean(timeError)}
              aria-describedby={`${id}-slot-hint${timeError ? ` ${id}-slot-error` : ""}`}
              onChange={(event) => {
                setSelectedStart(event.target.value);
                setTimeError(undefined);
              }}
            >
              <option value="">
                {slotsLoading
                  ? "Consultando horários…"
                  : "Selecione um horário"}
              </option>
              {available.map((slot) => (
                <option key={slot.start} value={slot.start}>
                  {calendarTimeLabel(slot.start)}
                </option>
              ))}
            </select>
          </FormField>
        )}
        {!manual &&
          currentResult &&
          !currentResult.error &&
          available.length === 0 && (
            <p role="status" className="text-sm text-muted-foreground">
              Nenhum horário livre neste dia. Escolha outra data ou informe um
              horário para a recepção conferir.
            </p>
          )}
        {!manual && currentResult?.error && (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">
              {currentResult.error}
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setSelectedStart("");
                setRetry((value) => value + 1);
              }}
            >
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </Button>
          </div>
        )}
        <FormField
          id={`${id}-reason`}
          label={
            outsideAvailability
              ? "Motivo da remarcação e do encaixe"
              : "Motivo da remarcação"
          }
          hint="Registre apenas informações necessárias à organização da agenda."
          error={reasonError}
        >
          <textarea
            ref={reasonInput}
            id={`${id}-reason`}
            className={textareaClassName}
            maxLength={1000}
            value={reason}
            aria-required="true"
            aria-invalid={Boolean(reasonError)}
            aria-describedby={`${id}-reason-hint${reasonError ? ` ${id}-reason-error` : ""}`}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(undefined);
            }}
          />
        </FormField>
      </fieldset>
      {start && (
        <div
          className="space-y-1 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"
          aria-live="polite"
        >
          <p className="font-semibold">
            Novo horário · {formatDateTimePtBr(start)}
          </p>
          <p>
            {appointment.durationMinutes} minutos com{" "}
            {appointment.doctor.user.name}.
          </p>
          <p className="text-muted-foreground">
            A consulta anterior ficará no histórico. Paciente e profissional
            receberão uma notificação.
          </p>
        </div>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {conflict && (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Atualize os dados da consulta antes de escolher novamente. O motivo
            digitado precisará ser informado outra vez.
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={saving}
            onClick={onRefresh}
          >
            <RefreshCw aria-hidden="true" /> Atualizar consulta
          </Button>
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={saving}
          onClick={onClose}
        >
          Voltar
        </Button>
        <Button
          type="submit"
          className="min-h-11"
          disabled={saving || conflict || (!manual && slotsLoading)}
        >
          {saving ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <CalendarClock aria-hidden="true" />
          )}
          {saving ? "Remarcando…" : "Confirmar remarcação"}
        </Button>
      </div>
    </form>
  );
}
