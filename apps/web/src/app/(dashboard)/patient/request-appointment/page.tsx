"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarPlus, Clock3, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName, textareaClassName } from "@/components/forms/form-field";
import { type DoctorOption, type ScheduleRequest, requestStatusLabels, validRequestDate } from "@/components/schedule-requests/types";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";
import { calendarDateKey, calendarDayLabel, calendarShiftDate, calendarTimeLabel, type CalendarSlot } from "@/lib/calendar";

const cardClass = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
const errorClass = "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive";

export default function RequestAppointmentPage() {
  return <Suspense fallback={<p role="status" className="text-muted-foreground">Carregando solicitação...</p>}><RequestAppointmentForm /></Suspense>;
}

function RequestAppointmentForm() {
  const searchParams = useSearchParams();
  const today = calendarDateKey(new Date());
  const queryDate = validRequestDate(searchParams.get("date"));
  const queryDoctor = searchParams.get("doctorId") ?? "";
  const queryTime = searchParams.get("time") ?? "";
  const [mode, setMode] = useState<"EXACT" | "FLEXIBLE">("EXACT");
  const [date, setDate] = useState(queryDate >= today ? queryDate : today);
  const [doctorId, setDoctorId] = useState(/^[a-zA-Z0-9_-]{1,100}$/.test(queryDoctor) ? queryDoctor : "");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<CalendarSlot | null>(null);
  const [shift, setShift] = useState("INDIFFERENT");
  const [modality, setModality] = useState("IN_PERSON");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [slotError, setSlotError] = useState(false);
  const slotsRef = useRef<HTMLFieldSetElement>(null);
  const queryApplied = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      apiFetch<DoctorOption[]>("/doctors", { signal: controller.signal }),
      apiFetch<ScheduleRequest[]>("/schedule-requests/mine", { signal: controller.signal }),
    ]).then(([availableDoctors, ownRequests]) => {
      setDoctors(availableDoctors);
      setRequests(ownRequests);
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(err instanceof ApiError ? err.message : "Não foi possível carregar os dados. Tente atualizar a página.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!validRequestDate(date)) return () => controller.abort();
    const params = new URLSearchParams({ from: date, to: calendarShiftDate(date, 1) });
    if (doctorId) params.set("doctorId", doctorId);
    void apiFetch<{ items: CalendarSlot[] }>(`/appointments/available-slots?${params}`, { signal: controller.signal })
      .then(({ items }) => {
        setSlots(items);
        if (!queryApplied.current) {
          queryApplied.current = true;
          const match = items.find((slot) => (!queryDoctor || slot.doctorId === queryDoctor) && calendarTimeLabel(slot.start) === queryTime);
          if (match) setSelectedSlot(match);
        }
      }).catch((err: unknown) => {
        if (!controller.signal.aborted) setSlotsError(err instanceof ApiError ? err.message : "Não foi possível consultar os horários. Tente novamente.");
      }).finally(() => { if (!controller.signal.aborted) setSlotsLoading(false); });
    return () => controller.abort();
  }, [date, doctorId, refresh, queryDoctor, queryTime]);

  function changeDay(next: string) {
    setDate(next); setSelectedSlot(null); setSlots([]); setSlotsLoading(Boolean(validRequestDate(next))); setSlotsError(null); setSlotError(false);
  }
  function refreshSlots() {
    setSelectedSlot(null); setSlots([]); setSlotsLoading(true); setSlotsError(null); setRefresh((value) => value + 1);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (mode === "EXACT" && (!selectedSlot || slotsLoading || !slots.some((slot) => slot.doctorId === selectedSlot.doctorId && slot.start === selectedSlot.start))) {
      setSlotError(true); slotsRef.current?.focus(); return;
    }
    if (!validRequestDate(date) || date < today) {
      setError("Escolha uma data válida a partir de hoje."); document.getElementById("request-date")?.focus(); return;
    }
    setSending(true); setError(null); setSuccess(null);
    try {
      await apiFetch("/schedule-requests", {
        method: "POST",
        body: JSON.stringify({
          type: "novo_paciente", mode, modality,
          ...(mode === "EXACT" && selectedSlot ? { preferredDoctorId: selectedSlot.doctorId, requestedStartDatetime: selectedSlot.start } : {
            ...(doctorId ? { preferredDoctorId: doctorId } : {}), preferredDate: date, preferredShift: shift,
          }), ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      setSuccess(mode === "EXACT" ? "Pedido enviado. O horário ainda não está reservado: aguarde a confirmação da recepção em Minhas solicitações." : "Pedido de encaixe enviado. A recepção analisará suas preferências e confirmará um horário.");
      setReason(""); refreshSlots();
      try { setRequests(await apiFetch<ScheduleRequest[]>("/schedule-requests/mine")); }
      catch { setError("Pedido enviado, mas a lista não pôde ser atualizada. Atualize a página para acompanhar."); }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar sua solicitação. Tente novamente.");
      if (err instanceof ApiError && err.status === 409) refreshSlots();
    } finally { setSending(false); }
  }

  return <div className="mx-auto max-w-5xl space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-foreground">Solicitar consulta</h1><p className="mt-1 text-sm text-muted-foreground">Escolha o dia e um horário livre. A recepção confirma seu pedido.</p></div>
      <Link href="/patient/calendar" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"><CalendarPlus className="size-4" /> Ver calendário</Link>
    </header>
    <form onSubmit={submit} className={`${cardClass} space-y-6`}>
      <fieldset disabled={sending} className="space-y-3">
        <legend className="mb-3 font-semibold">Como deseja agendar?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {([{ value: "EXACT", title: "Escolher horário disponível", text: "Dia, horário e profissional definidos por você." }, { value: "FLEXIBLE", title: "Solicitar encaixe", text: "Tenho flexibilidade; a recepção pode definir o horário." }] as const).map((option) => <label key={option.value} className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4 ${mode === option.value ? "border-primary bg-primary/5" : "border-border"}`}>
            <input type="radio" name="request-mode" value={option.value} checked={mode === option.value} onChange={() => { setMode(option.value); setSlotError(false); }} className="mt-1 size-4 accent-primary" />
            <span><span className="block text-sm font-semibold">{option.title}</span><span className="mt-1 block text-xs text-muted-foreground">{option.text}</span></span>
          </label>)}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="request-doctor" label={mode === "EXACT" ? "Filtrar por profissional" : "Profissional de preferência"}>
          <select id="request-doctor" className={inputClassName} disabled={sending || loading} value={doctorId} onChange={(event) => { setDoctorId(event.target.value); setSelectedSlot(null); setSlots([]); setSlotsLoading(true); setSlotsError(null); }}>
            <option value="">{mode === "EXACT" ? "Todos os profissionais" : "Sem preferência"}</option>
            {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user.name} — {doctor.specialty}</option>)}
          </select>
        </FormField>
        <FormField id="request-date" label={mode === "EXACT" ? "Dia da consulta" : "Data de preferência"} hint="Todos os horários estão no fuso de Brasília.">
          <input id="request-date" className={inputClassName} type="date" required min={today} value={date} disabled={sending} onChange={(event) => changeDay(event.target.value)} />
        </FormField>
      </div>
      {mode === "EXACT" ? <>
        <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Atalhos de datas">
          {Array.from({ length: 7 }, (_, index) => calendarShiftDate(today, index)).map((day, index) => <button key={day} type="button" disabled={sending} aria-pressed={date === day} onClick={() => changeDay(day)} className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring ${date === day ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{index === 0 ? "Hoje" : index === 1 ? "Amanhã" : calendarDayLabel(day, { weekday: "short", day: "2-digit", month: "2-digit" })}</button>)}
        </div>
        <fieldset ref={slotsRef} tabIndex={-1} aria-describedby="request-slots-hint request-slots-error" className="space-y-3 rounded-xl outline-offset-4 focus-visible:outline-2 focus-visible:outline-ring" disabled={sending}>
          <legend className="mb-2 font-semibold">Horários disponíveis · 50 minutos</legend>
          <p id="request-slots-hint" className="text-sm text-muted-foreground">São exibidos somente horários livres da agenda dos profissionais, sem conflito com suas consultas.</p>
          {slotsLoading ? <p role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Consultando horários...</p> : slotsError ? <div className={errorClass} role="alert">{slotsError}<Button type="button" variant="outline" className="mt-3 min-h-11" onClick={refreshSlots}>Tentar novamente</Button></div> : slots.length === 0 ? <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Não há horários livres neste dia para o filtro selecionado.<div className="mt-3 flex flex-wrap gap-3"><Button type="button" variant="outline" className="min-h-11" onClick={() => changeDay(calendarShiftDate(date || today, 1))}>Ver próximo dia</Button><Button type="button" variant="outline" className="min-h-11" onClick={() => setMode("FLEXIBLE")}>Solicitar encaixe</Button></div></div> : <div className="grid max-h-96 gap-2 overflow-y-auto p-1 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot) => { const checked = selectedSlot?.doctorId === slot.doctorId && selectedSlot.start === slot.start; return <label key={`${slot.doctorId}:${slot.start}`} className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-3 has-focus-visible:outline-2 has-focus-visible:outline-ring ${checked ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/50"}`}><input type="radio" name="request-slot" checked={checked} value={`${slot.doctorId}:${slot.start}`} onChange={() => { setSelectedSlot(slot); setSlotError(false); }} className="mt-1 size-4 accent-primary" /><span><span className="flex items-center gap-2 font-semibold"><Clock3 className="size-4" />{calendarTimeLabel(slot.start)} – {calendarTimeLabel(slot.end)}</span><span className="mt-1 block text-sm text-muted-foreground">{slot.doctorName}</span></span></label>; })}
          </div>}
          {slotError && <p id="request-slots-error" role="alert" className="text-sm text-destructive">Escolha um horário disponível para continuar.</p>}
          <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm text-primary underline underline-offset-4" disabled={slotsLoading || sending} onClick={refreshSlots}><RefreshCw className="size-4" /> Atualizar horários</button>
        </fieldset>
      </> : <FormField id="request-shift" label="Turno de preferência" hint="O encaixe será analisado pela recepção; esta opção não garante um horário."><select id="request-shift" value={shift} disabled={sending} onChange={(event) => setShift(event.target.value)} className={inputClassName}><option value="INDIFFERENT">Qualquer turno</option><option value="MORNING">Manhã</option><option value="AFTERNOON">Tarde</option></select></FormField>}
      <FormField id="request-modality" label="Modalidade"><select id="request-modality" className={inputClassName} value={modality} disabled={sending} onChange={(event) => setModality(event.target.value)}><option value="IN_PERSON">Presencial</option><option value="ONLINE">Online</option></select></FormField>
      <FormField id="request-reason" label="Observação para a recepção (opcional)" hint="Não informe dados clínicos sensíveis neste campo."><textarea id="request-reason" className={textareaClassName} maxLength={2000} value={reason} disabled={sending} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: tenho flexibilidade no período da tarde" /></FormField>
      {selectedSlot && mode === "EXACT" && <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm"><p className="font-semibold">Revise seu pedido</p><p className="mt-1">{formatDateTimePtBr(selectedSlot.start)} · {selectedSlot.doctorName} · {modality === "ONLINE" ? "Online" : "Presencial"}</p><p className="mt-2 text-muted-foreground">O horário será reservado somente após a aprovação da recepção.</p></div>}
      {error && <p role="alert" className={errorClass}>{error}</p>}
      {success && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">{success}</p>}
      <div className="flex justify-end border-t pt-5"><Button type="submit" disabled={sending || loading || (mode === "EXACT" && slotsLoading)} className="min-h-11 w-full sm:w-auto">{sending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}{sending ? "Enviando..." : mode === "EXACT" ? "Solicitar este horário" : "Enviar pedido de encaixe"}</Button></div>
    </form>
    <section className="space-y-4"><div><h2 className="text-lg font-semibold">Minhas solicitações</h2><p className="mt-1 text-sm text-muted-foreground">Os pedidos ficam pendentes até a decisão da recepção.</p></div>
      {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando solicitações...</p> : requests.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Você ainda não enviou solicitações.</p> : <ul className="space-y-3">{requests.map((request) => <li key={request.id} className={`${cardClass} flex flex-col gap-3 sm:flex-row sm:justify-between`}><div className="space-y-1 text-sm"><p className="font-semibold">{request.mode === "EXACT" ? "Horário escolhido" : "Pedido de encaixe"}{request.preferredDoctor ? ` · ${request.preferredDoctor.user.name}` : ""}</p><p>{request.mode === "EXACT" && request.requestedStartDatetime ? formatDateTimePtBr(request.requestedStartDatetime) : `${request.preferredDate ? formatDatePtBr(request.preferredDate) : "Qualquer data"} · ${request.preferredShift === "MORNING" ? "Manhã" : request.preferredShift === "AFTERNOON" ? "Tarde" : "Qualquer turno"}`}</p>{request.generatedAppointment && <p className="font-medium text-primary">Confirmada: {formatDateTimePtBr(request.generatedAppointment.startDatetime)} · <Link className="underline underline-offset-4" href="/patient/calendar">Ver na agenda</Link></p>}{request.status === "PENDING" && <p className="text-muted-foreground">Aguardando confirmação da recepção.</p>}{request.status === "REJECTED" && <p className="text-muted-foreground">Escolha outro horário acima ou solicite um encaixe.</p>}<p className="text-xs text-muted-foreground">Enviado em {formatDateTimePtBr(request.createdAt)}</p></div><span className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-semibold ${request.status === "PENDING" ? "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100" : request.status === "APPROVED" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{requestStatusLabels[request.status]}</span></li>)}</ul>}
    </section>
  </div>;
}
