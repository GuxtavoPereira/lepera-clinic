"use client";

import { useEffect, useState } from "react";
import { CalendarCheck2, Check, Clock3, Loader2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName, textareaClassName } from "@/components/forms/form-field";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { type DoctorOption, type ScheduleRequest } from "@/components/schedule-requests/types";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";
import { calendarDateKey } from "@/lib/calendar";

type ReviewAction = { kind: "approve" | "reject"; request: ScheduleRequest };
const errorClass = "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive";

export default function ReceptionRequestsPage() {
  const [requests, setRequests] = useState<ScheduleRequest[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("50");
  const [modality, setModality] = useState("IN_PERSON");
  const [notes, setNotes] = useState("");
  const [outsideHours, setOutsideHours] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const today = calendarDateKey(new Date());

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      apiFetch<ScheduleRequest[]>("/schedule-requests/pending", { signal: controller.signal }),
      apiFetch<DoctorOption[]>("/doctors", { signal: controller.signal }),
    ]).then(([pending, availableDoctors]) => { setRequests(pending); setDoctors(availableDoctors); })
      .catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof ApiError ? err.message : "Não foi possível carregar as solicitações. Tente novamente."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  function openAction(request: ScheduleRequest, kind: ReviewAction["kind"]) {
    setActionError(null); setFieldErrors({}); setAction({ request, kind });
    setDoctorId(request.preferredDoctorId ?? "");
    setDate(request.preferredDate && calendarDateKey(request.preferredDate) >= today ? calendarDateKey(request.preferredDate) : today);
    setTime(""); setDuration(String(request.durationMinutes || 50)); setModality(request.modality || "IN_PERSON"); setNotes(""); setOutsideHours(false);
  }
  function reload() { setError(null); setLoading(true); setRefresh((value) => value + 1); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action || saving) return;
    const flexible = action.request.mode !== "EXACT";
    let payload: Record<string, string | number | boolean> = {};
    if (action.kind === "approve" && flexible) {
      const errors: Record<string, string> = {};
      if (!doctorId || !doctors.some((doctor) => doctor.id === doctorId)) errors["review-doctor"] = "Selecione um profissional disponível.";
      const start = new Date(`${date}T${time}:00-03:00`);
      if (!date || !time || !Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) errors["review-date"] = "Escolha uma data e horário futuros (Brasília).";
      if (!Number.isInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > 240) errors["review-duration"] = "Informe de 1 a 240 minutos.";
      if (notes.trim().length < 5) errors["review-notes"] = "Informe a justificativa do encaixe com pelo menos 5 caracteres.";
      setFieldErrors(errors);
      const first = Object.keys(errors)[0];
      if (first) { document.getElementById(first)?.focus(); return; }
      payload = { doctorId, startDatetime: start.toISOString(), durationMinutes: Number(duration), modality, receptionNotes: notes.trim(), allowOutsideAvailability: outsideHours };
    }
    setSaving(true); setActionError(null); setSuccess(null);
    try {
      await apiFetch(`/schedule-requests/${action.request.id}/${action.kind}`, { method: "PATCH", body: JSON.stringify(payload) });
      setRequests((current) => current.filter((request) => request.id !== action.request.id));
      setSuccess(action.kind === "approve" ? `Consulta de ${action.request.patient.user.name} confirmada. O paciente foi notificado e a consulta já está na agenda do profissional.` : `Pedido de ${action.request.patient.user.name} recusado. O paciente foi notificado para escolher outra opção.`);
      setAction(null);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível concluir a análise. Tente novamente.");
    } finally { setSaving(false); }
  }

  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  const visible = requests.filter((request) => (filter === "ALL" || (filter === "EXACT" ? request.mode === "EXACT" : request.mode !== "EXACT")) && [request.patient.user.name, request.patient.user.email, request.preferredDoctor?.user.name ?? "", request.requestedStartDatetime ? formatDateTimePtBr(request.requestedStartDatetime) : ""].join(" ").toLocaleLowerCase("pt-BR").includes(normalized));
  const exactCount = requests.filter((request) => request.mode === "EXACT").length;

  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold text-foreground">Solicitações de agendamento</h1><p className="mt-1 text-sm text-muted-foreground">Confirme o horário escolhido pelo paciente ou defina um encaixe.</p></div><Button variant="outline" disabled={loading || saving} className="min-h-11" onClick={reload}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /> Atualizar</Button></header>
    <div className="grid gap-3 sm:grid-cols-3">{[{ title: "Pendentes", value: requests.length }, { title: "Horários escolhidos", value: exactCount }, { title: "Pedidos de encaixe", value: requests.length - exactCount }].map((item) => <div key={item.title} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{item.title}</p><p className="mt-1 text-2xl font-semibold">{item.value}</p></div>)}</div>
    <div className="grid gap-4 sm:grid-cols-[1fr_220px]"><FormField id="request-search" label="Buscar solicitação"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><input id="request-search" type="search" className={`${inputClassName} pl-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Paciente, e-mail, profissional ou data" /></div></FormField><FormField id="request-filter" label="Tipo de pedido"><select id="request-filter" className={inputClassName} value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">Todos os pedidos</option><option value="EXACT">Horário escolhido</option><option value="FLEXIBLE">Encaixe</option></select></FormField></div>
    {error && <div role="alert" className={errorClass}>{error}<Button variant="outline" className="mt-3 min-h-11" onClick={reload}>Tentar novamente</Button></div>}
    {success && <p role="status" className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">{success}</p>}
    {loading ? <p role="status" className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Carregando solicitações...</p> : visible.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{requests.length ? "Nenhuma solicitação corresponde à busca." : error ? "Atualize para carregar os pedidos." : "Tudo em dia! Não há solicitações pendentes."}</div> : <ul className="space-y-4">{visible.map((request) => <li key={request.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-col justify-between gap-5 lg:flex-row"><div className="min-w-0 space-y-3"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{request.patient.user.name}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${request.mode === "EXACT" ? "bg-primary/10 text-primary" : "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100"}`}>{request.mode === "EXACT" ? "Horário escolhido" : "Encaixe"}</span></div><p className="break-all text-sm text-muted-foreground">{request.patient.user.email}</p>{request.mode === "EXACT" && request.requestedStartDatetime ? <div className="space-y-1 rounded-xl bg-muted/60 p-3 text-sm"><p className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 shrink-0" /> {formatDateTimePtBr(request.requestedStartDatetime)}</p><p>{request.preferredDoctor?.user.name ?? "Profissional indisponível"} · {request.durationMinutes} min · {request.modality === "ONLINE" ? "Online" : "Presencial"}</p><p className="text-xs text-muted-foreground">Aprovar mantém exatamente este profissional e horário.</p></div> : <div className="text-sm"><p>Preferência: {request.preferredDate ? formatDatePtBr(request.preferredDate) : "Qualquer data"} · {request.preferredShift === "MORNING" ? "Manhã" : request.preferredShift === "AFTERNOON" ? "Tarde" : "Qualquer turno"}</p><p className="mt-1 text-muted-foreground">{request.preferredDoctor?.user.name ?? "Sem preferência de profissional"} · {request.modality === "ONLINE" ? "Online" : "Presencial"}</p></div>}{request.reason && <p className="whitespace-pre-wrap break-words text-sm"><span className="font-medium">Observação: </span>{request.reason}</p>}<p className="text-xs text-muted-foreground">Recebido em {formatDateTimePtBr(request.createdAt)} · Horário de Brasília</p></div><div className="flex shrink-0 flex-wrap gap-2 lg:items-start"><Button className="min-h-11" disabled={saving} onClick={() => openAction(request, "approve")}><Check className="size-4" />{request.mode === "EXACT" ? "Aprovar horário" : "Definir encaixe"}</Button><Button variant="outline" className="min-h-11" disabled={saving} onClick={() => openAction(request, "reject")}><X className="size-4" /> Recusar</Button></div></div></li>)}</ul>}
    <Sheet open={action !== null} onOpenChange={(open) => { if (!open && !saving) setAction(null); }}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-xl overflow-y-auto" showCloseButton={!saving}>
        <SheetHeader className="border-b p-6 pr-12"><SheetTitle>{action?.kind === "reject" ? "Recusar solicitação" : action?.request.mode === "EXACT" ? "Confirmar horário escolhido" : "Definir encaixe"}</SheetTitle><SheetDescription>{action?.request.patient.user.name}. {action?.kind === "approve" ? "O paciente será notificado após a confirmação." : "O paciente poderá escolher outro horário ou enviar novo pedido."}</SheetDescription></SheetHeader>
        {action && <form onSubmit={submit} className="flex flex-1 flex-col gap-5 p-6">
          {action.kind === "reject" ? <p className="text-sm text-muted-foreground">Deseja recusar este pedido? Nenhuma consulta será criada.</p> : action.request.mode === "EXACT" ? <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4"><CalendarCheck2 className="size-6 text-primary" /><p className="font-semibold">{action.request.requestedStartDatetime ? formatDateTimePtBr(action.request.requestedStartDatetime) : "Horário inválido"}</p><p className="text-sm">{action.request.preferredDoctor?.user.name ?? "Profissional indisponível"} · {action.request.durationMinutes} minutos · {action.request.modality === "ONLINE" ? "Online" : "Presencial"}</p><p className="text-sm text-muted-foreground">A disponibilidade será conferida novamente. Se o horário já foi ocupado, a aprovação será impedida.</p></div> : <>
            <FormField id="review-doctor" label="Profissional" error={fieldErrors["review-doctor"]}><select id="review-doctor" className={inputClassName} value={doctorId} disabled={saving} onChange={(event) => setDoctorId(event.target.value)} aria-invalid={Boolean(fieldErrors["review-doctor"])} aria-describedby={fieldErrors["review-doctor"] ? "review-doctor-error" : undefined}><option value="">Selecione um profissional</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.user.name} — {doctor.specialty}</option>)}</select></FormField>
            <div className="grid gap-4 sm:grid-cols-2"><FormField id="review-date" label="Data" error={fieldErrors["review-date"]}><input id="review-date" type="date" className={inputClassName} min={today} value={date} disabled={saving} onChange={(event) => setDate(event.target.value)} aria-invalid={Boolean(fieldErrors["review-date"])} aria-describedby={fieldErrors["review-date"] ? "review-date-error" : undefined} /></FormField><FormField id="review-time" label="Horário (Brasília)"><input id="review-time" type="time" className={inputClassName} value={time} disabled={saving} onChange={(event) => setTime(event.target.value)} aria-invalid={Boolean(fieldErrors["review-date"])} /></FormField></div>
            <div className="grid gap-4 sm:grid-cols-2"><FormField id="review-duration" label="Duração (minutos)" error={fieldErrors["review-duration"]}><input id="review-duration" type="number" min={1} max={240} className={inputClassName} value={duration} disabled={saving} onChange={(event) => setDuration(event.target.value)} aria-invalid={Boolean(fieldErrors["review-duration"])} /></FormField><FormField id="review-modality" label="Modalidade"><select id="review-modality" className={inputClassName} value={modality} disabled={saving} onChange={(event) => setModality(event.target.value)}><option value="IN_PERSON">Presencial</option><option value="ONLINE">Online</option></select></FormField></div>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-4"><input type="checkbox" className="mt-1 size-4 accent-primary" checked={outsideHours} disabled={saving} onChange={(event) => setOutsideHours(event.target.checked)} /><span><span className="text-sm font-semibold">Autorizar encaixe fora da disponibilidade cadastrada</span><span className="mt-1 block text-xs text-muted-foreground">Use após combinar com o profissional. Conflitos com outras consultas do profissional ou do paciente continuam bloqueados.</span></span></label>
            <FormField id="review-notes" label="Justificativa do encaixe" error={fieldErrors["review-notes"]} hint="Registre o acordo realizado com o profissional ou o motivo da escolha do horário."><textarea id="review-notes" className={textareaClassName} maxLength={2000} value={notes} disabled={saving} onChange={(event) => setNotes(event.target.value)} aria-invalid={Boolean(fieldErrors["review-notes"])} aria-describedby={fieldErrors["review-notes"] ? "review-notes-error" : "review-notes-hint"} /></FormField>
          </>}
          {actionError && <p role="alert" className={errorClass}>{actionError}</p>}
          <div className="mt-auto flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="min-h-11" disabled={saving} onClick={() => setAction(null)}>Voltar</Button><Button type="submit" variant={action.kind === "reject" ? "destructive" : "default"} className="min-h-11" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : action.kind === "reject" ? <X className="size-4" /> : <Check className="size-4" />}{saving ? "Processando..." : action.kind === "reject" ? "Confirmar recusa" : "Confirmar agendamento"}</Button></div>
        </form>}
      </SheetContent>
    </Sheet>
  </div>;
}
