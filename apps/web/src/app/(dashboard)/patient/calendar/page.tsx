"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppointmentStatus } from "@lepera/contracts";
import { CalendarDays, List, RotateCw } from "lucide-react";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { calendarDateKey, calendarTimeLabel, type CalendarEvent, type CalendarRange, type CalendarSlot } from "@/lib/calendar";

type OwnAppointment = {
  id: string;
  startDatetime: string;
  endDatetime: string;
  status: AppointmentStatus;
  modality: string;
  doctorId: string;
  doctor: { user: { name: string } };
};
type DoctorOption = { id: string; user: { name: string } };
const statusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: "Agendada", CONFIRMED: "Confirmada", COMPLETED: "Realizada",
  CANCELLED: "Cancelada", RESCHEDULED: "Remarcada", WAITING: "Aguardando atendimento",
};

export default function PatientCalendarPage() {
  const router = useRouter();
  const [range, setRange] = useState<CalendarRange | null>(null);
  const rangeKey = useRef("");
  const [doctorId, setDoctorId] = useState("");
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [appointments, setAppointments] = useState<OwnAppointment[]>([]);
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedDetails = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
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
    void Promise.allSettled([
      apiFetch<{ items: OwnAppointment[] }>(`/appointments/calendar?${params}`),
      apiFetch<{ items: CalendarSlot[] }>(`/appointments/available-slots?${params}`),
    ]).then(([own, available]) => {
      if (!active) return;
      if (own.status === "fulfilled") { setAppointments(own.value.items); setError(null); }
      else { setAppointments([]); setError(own.reason instanceof ApiError ? own.reason.message : "Não foi possível carregar suas consultas."); }
      if (available.status === "fulfilled") { setSlots(available.value.items); setSlotError(null); }
      else { setSlots([]); setSlotError(available.reason instanceof ApiError ? available.reason.message : "Não foi possível carregar os horários livres."); }
      setLoading(false);
    });
    return () => { active = false; };
  }, [range, doctorId, reloadKey]);

  function reload() { setLoading(true); setReloadKey((key) => key + 1); }

  function requestSlot(slot: CalendarSlot) {
    if (loading) return;
    const params = new URLSearchParams({ doctorId: slot.doctorId, date: calendarDateKey(slot.start), time: calendarTimeLabel(slot.start) });
    router.push(`/patient/request-appointment?${params}`);
  }

  const events: CalendarEvent[] = appointments.map((item) => ({
    id: item.id, start: item.startDatetime, end: item.endDatetime,
    title: "Minha consulta", subtitle: item.doctor.user.name,
    status: item.status, doctorId: item.doctorId,
  }));
  const selected = appointments.find((item) => item.id === selectedId);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Meu calendário</h1>
          <p className="mt-1 text-sm text-slate-500">Suas consultas e os horários livres dos profissionais, no horário de Brasília.</p>
        </div>
        <Link href="/patient/appointments" className="inline-flex h-9 items-center gap-2 rounded-lg border bg-white px-3 text-sm font-medium"><List className="size-4" />Ver consultas e solicitações em lista</Link>
      </header>
      <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">Escolha um horário livre para preencher uma solicitação. A recepção precisa aprovar o agendamento; o clique não reserva a vaga.</p>
      {(slotError || doctorError) && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{slotError ?? doctorError}</p>}
      <AppointmentCalendar
        title="Consultas e horários livres"
        events={events}
        slots={slots}
        loading={loading}
        error={error}
        onRangeChange={changeRange}
        onSelectEvent={(event) => {
          if (event.id === selectedId) focusDetails();
          else setSelectedId(event.id);
        }}
        onSelectSlot={requestSlot}
        doctors={doctors.map((doctor) => ({ id: doctor.id, name: doctor.user.name }))}
        selectedDoctorId={doctorId}
        onDoctorChange={(id) => { if (id === doctorId) return; setLoading(true); setSelectedId(null); setDoctorId(id); }}
      />
      {(error || slotError || doctorError) && <Button type="button" variant="outline" onClick={reload}><RotateCw className="size-4" />Tentar novamente</Button>}
      {selected && (
        <section ref={selectedDetails} tabIndex={-1} aria-labelledby="selected-appointment-title" className="scroll-mt-24 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <h2 id="selected-appointment-title" className="flex items-center gap-2 font-semibold"><CalendarDays className="size-4" />Minha consulta · {statusLabels[selected.status]}</h2>
          <p className="text-sm text-slate-600">{selected.doctor.user.name} · {calendarDateKey(selected.startDatetime).split("-").reverse().join("/")} · {calendarTimeLabel(selected.startDatetime)} às {calendarTimeLabel(selected.endDatetime)} · {selected.modality === "ONLINE" ? "Online" : "Presencial"}</p>
          {(selected.status === "SCHEDULED" || selected.status === "CONFIRMED") && <CancelAppointmentButton key={selected.id} appointmentId={selected.id} onCancelled={reload} />}
        </section>
      )}
    </div>
  );
}