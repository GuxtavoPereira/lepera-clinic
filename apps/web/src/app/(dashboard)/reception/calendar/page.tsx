"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AppointmentStatus } from "@lepera/contracts";
import { CalendarDays, CalendarPlus, List, RotateCw } from "lucide-react";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { calendarDateKey, calendarTimeLabel, type CalendarEvent, type CalendarRange } from "@/lib/calendar";

type CalendarAppointment = {
  id: string;
  startDatetime: string;
  endDatetime: string;
  status: AppointmentStatus;
  type: string;
  modality: string;
  doctorId: string;
  doctor: { user: { name: string } };
  patient?: { user: { name: string } };
};
type DoctorOption = { id: string; user: { name: string } };

export default function ReceptionCalendarPage() {
  const [range, setRange] = useState<CalendarRange | null>(null);
  const rangeKey = useRef("");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedDetails = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const focusDetails = useCallback(() => {
    const details = selectedDetails.current;
    if (!details) return;
    details.focus({ preventScroll: true });
    details.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "center",
    });
  }, []);

  useEffect(() => {
    if (selectedId) focusDetails();
  }, [selectedId, focusDetails]);

  const changeRange = useCallback((next: CalendarRange) => {
    const key = `${next.from}/${next.to}`;
    if (key === rangeKey.current) return;
    rangeKey.current = key;
    setLoading(true);
    setSelectedId(null);
    setRange(next);
  }, []);

  useEffect(() => {
    let active = true;
    void apiFetch<DoctorOption[]>("/doctors")
      .then((items) => { if (active) { setDoctors(items); setDoctorError(null); } })
      .catch(() => { if (active) setDoctorError("Não foi possível carregar o filtro de profissionais."); });
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    if (!range) return;
    let active = true;
    const params = new URLSearchParams({ from: range.from, to: range.to });
    if (doctorId) params.set("doctorId", doctorId);
    void apiFetch<{ items: CalendarAppointment[] }>(`/appointments/calendar?${params}`)
      .then(({ items }) => { if (active) { setAppointments(items); setError(null); } })
      .catch((err: unknown) => {
        if (!active) return;
        setAppointments([]);
        setError(err instanceof ApiError ? err.message : "Não foi possível carregar o calendário.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, doctorId, reloadKey]);

  function reload() {
    setLoading(true);
    setReloadKey((key) => key + 1);
  }

  const events: CalendarEvent[] = appointments.map((item) => ({
    id: item.id,
    start: item.startDatetime,
    end: item.endDatetime,
    title: item.patient?.user.name ?? "Consulta",
    subtitle: item.doctor.user.name,
    status: item.status,
    doctorId: item.doctorId,
  }));
  const selected = appointments.find((item) => item.id === selectedId);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Calendário da clínica</h1>
          <p className="mt-1 text-sm text-slate-500">Consulte a agenda por semana ou dia, no horário de Brasília.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/reception/appointments" className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium"><List className="size-4" />Ver lista e solicitações</Link>
          <Link href="/reception/appointments/new" className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"><CalendarPlus className="size-4" />Novo agendamento</Link>
        </div>
      </header>
      {doctorError && <p role="alert" className="text-sm text-amber-800">{doctorError}</p>}
      <AppointmentCalendar
        events={events}
        loading={loading}
        error={error}
        title="Agenda geral"
        onRangeChange={changeRange}
        doctors={doctors.map((doctor) => ({ id: doctor.id, name: doctor.user.name }))}
        selectedDoctorId={doctorId}
        onDoctorChange={(id) => { if (id === doctorId) return; setLoading(true); setSelectedId(null); setDoctorId(id); }}
        onSelectEvent={(event) => {
          if (event.id === selectedId) focusDetails();
          else setSelectedId(event.id);
        }}
      />
      {(error || doctorError) && <Button type="button" variant="outline" onClick={reload}><RotateCw className="size-4" />Tentar novamente</Button>}
      {selected && (
        <section ref={selectedDetails} tabIndex={-1} aria-labelledby="selected-appointment-title" className="scroll-mt-24 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <h2 id="selected-appointment-title" className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4" />{selected.patient?.user.name ?? "Consulta"}</h2>
          <p className="text-sm text-slate-600">{selected.doctor.user.name} · {calendarDateKey(selected.startDatetime).split("-").reverse().join("/")} · {calendarTimeLabel(selected.startDatetime)} às {calendarTimeLabel(selected.endDatetime)} · {selected.modality === "ONLINE" ? "Online" : "Presencial"}</p>
          {(selected.status === "SCHEDULED" || selected.status === "CONFIRMED") && <CancelAppointmentButton key={selected.id} appointmentId={selected.id} onCancelled={reload} />}
          <Link href="/reception/appointments" className="block text-sm text-primary underline underline-offset-4">Gerenciar consultas e pedidos de cancelamento na lista</Link>
        </section>
      )}
    </div>
  );
}