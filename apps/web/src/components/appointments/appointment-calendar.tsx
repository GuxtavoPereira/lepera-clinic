"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calendarDateKey, calendarDayLabel, calendarIntervalOnDay, calendarLayoutItems,
  calendarMonthDays, calendarRangeForDate, calendarShiftDate, calendarShiftMonth,
  calendarTimeLabel, type CalendarEvent, type CalendarRange, type CalendarSlot, type CalendarView,
} from "@/lib/calendar";

type Props = {
  events: CalendarEvent[];
  slots?: CalendarSlot[];
  loading?: boolean;
  error?: string | null;
  onRangeChange?: (range: CalendarRange) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onSelectSlot?: (slot: CalendarSlot) => void;
  doctors?: { id: string; name: string }[];
  selectedDoctorId?: string;
  onDoctorChange?: (id: string) => void;
  title?: string;
};

type CalendarBlock = {
  start: string;
  end: string;
  kind: "event";
  event: CalendarEvent;
} | {
  start: string;
  end: string;
  kind: "slot";
  slot: CalendarSlot;
};

const COLORS = [
  "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
  "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  "border-pink-200 bg-pink-50 text-pink-800 hover:bg-pink-100",
  "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100",
];
const DOT_COLORS = ["bg-blue-500", "bg-violet-500", "bg-pink-500", "bg-amber-500"];
const STATUS_LABELS: Record<CalendarEvent["status"], string> = {
  SCHEDULED: "Agendada", CONFIRMED: "Confirmada", COMPLETED: "Realizada",
  CANCELLED: "Cancelada", RESCHEDULED: "Remarcada", WAITING: "Aguardando",
};
const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOUR_HEIGHT = 68;
const EMPTY_SLOTS: CalendarSlot[] = [];

export function AppointmentCalendar({
  events, slots = EMPTY_SLOTS, loading = false, error, onRangeChange,
  onSelectEvent, onSelectSlot, doctors, selectedDoctorId = "", onDoctorChange,
  title = "Agenda",
}: Props) {
  const [day, setDay] = useState(() => calendarDateKey(new Date()));
  const [view, setView] = useState<CalendarView>("week");
  const [month, setMonth] = useState(() => calendarDateKey(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const today = calendarDateKey(new Date());
  const range = calendarRangeForDate(day, view);

  useEffect(() => {
    onRangeChange?.({ from: range.from, to: range.to });
  }, [range.from, range.to, onRangeChange]);

  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, index) =>
    calendarShiftDate(range.from, index));
  const visibleEvents = events.filter((event) =>
    (showCancelled || (event.status !== "CANCELLED" && event.status !== "RESCHEDULED")) &&
    days.some((value) => calendarIntervalOnDay(event.start, event.end, value)));
  const blocks = useMemo<CalendarBlock[]>(() => [
    ...events.filter((event) => showCancelled ||
      (event.status !== "CANCELLED" && event.status !== "RESCHEDULED"))
      .map((event): CalendarBlock => ({ kind: "event", event, start: event.start, end: event.end })),
    ...slots.map((slot): CalendarBlock => ({ kind: "slot", slot, start: slot.start, end: slot.end })),
  ], [events, slots, showCancelled]);
  const intervals = blocks.flatMap((item) => days.flatMap((value) => {
    const interval = calendarIntervalOnDay(item.start, item.end, value);
    return interval ? [interval] : [];
  }));
  const firstMinute = Math.floor(Math.min(8 * 60, ...intervals.map((item) => item.from)) / 60) * 60;
  const lastMinute = Math.ceil(Math.max(18 * 60, ...intervals.map((item) => item.to)) / 60) * 60;
  const gridHeight = (lastMinute - firstMinute) / 60 * HOUR_HEIGHT;
  const hours = Array.from({ length: (lastMinute - firstMinute) / 60 }, (_, index) => firstMinute / 60 + index);
  const colorIds = doctors?.map((doctor) => doctor.id) ??
    [...new Set([...events.map((event) => event.doctorId ?? ""), ...slots.map((slot) => slot.doctorId)])].sort();
  const colorIndex = (id: string | undefined) => Math.max(0, colorIds.indexOf(id ?? "")) % COLORS.length;
  const selectedDayEvents = visibleEvents.filter((event) =>
    calendarIntervalOnDay(event.start, event.end, day));
  const selectedDaySlots = slots.filter((slot) => calendarDateKey(slot.start) === day);

  function selectDay(value: string) {
    setDay(value);
    setMonth(value);
    setSelectedEventId(null);
  }

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" aria-label="Período anterior"
            disabled={loading} onClick={() => selectDay(calendarShiftDate(day, view === "week" ? -7 : -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" aria-label="Próximo período"
            disabled={loading} onClick={() => selectDay(calendarShiftDate(day, view === "week" ? 7 : 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" variant="outline" onClick={() => selectDay(today)} disabled={loading}>Hoje</Button>
          <p className="ml-1 text-sm font-semibold capitalize text-slate-800" aria-live="polite">
            {view === "day" ? calendarDayLabel(day, { day: "numeric", month: "long", year: "numeric" }) :
              `${calendarDayLabel(range.from, { day: "2-digit", month: "short" })} – ${calendarDayLabel(calendarShiftDate(range.to, -1), { day: "2-digit", month: "short", year: "numeric" })}`}
          </p>
        </div>
        <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1" aria-label="Visualização da agenda">
          {(["week", "day"] as const).map((option) => (
            <button type="button" key={option} aria-pressed={view === option}
              onClick={() => setView(option)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${view === option ? "bg-primary text-primary-foreground" : "text-slate-500 hover:bg-slate-50"}`}>
              {option === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white" aria-busy={loading}>
            {loading ? (
              <div role="status" className="flex min-h-96 items-center justify-center gap-2 text-sm text-slate-500">
                <CalendarDays className="size-5 animate-pulse" /> Carregando agenda...
              </div>
            ) : error && blocks.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">A agenda não pôde ser atualizada. Tente novamente.</p>
            ) : (
              <div className={view === "week" ? "min-w-[680px]" : "min-w-[280px]"}>
                <div className="grid border-b border-slate-100" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
                  <div className="border-r border-slate-100" />
                  {days.map((value) => (
                    <button type="button" key={value} onClick={() => selectDay(value)} aria-pressed={value === day}
                      aria-label={calendarDayLabel(value, { weekday: "long", day: "numeric", month: "long" })}
                      className={`flex flex-col items-center gap-1 border-r border-slate-100 px-1 py-3 text-xs last:border-r-0 hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-teal-600 ${value === day ? "bg-teal-50/50" : ""}`}>
                      <span className="uppercase text-slate-400">{calendarDayLabel(value, { weekday: "short" }).replace(".", "")}</span>
                      <span aria-current={value === today ? "date" : undefined}
                        className={`flex size-8 items-center justify-center rounded-full text-base font-semibold ${value === today ? "bg-primary text-primary-foreground" : value === day ? "bg-teal-100 text-teal-800" : "text-slate-900"}`}>
                        {Number(value.slice(-2))}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, minmax(0,1fr))` }}>
                  <div className="relative border-r border-slate-100" style={{ height: gridHeight }}>
                    {hours.map((hour, index) => <span key={hour} className="absolute right-2 text-[10px] text-slate-400"
                      style={{ top: index * HOUR_HEIGHT + 5 }}>{String(hour).padStart(2, "0")}:00</span>)}
                  </div>
                  {days.map((value) => (
                    <div key={value} className={`relative border-r border-slate-100 last:border-r-0 ${value === day ? "bg-teal-50/15" : ""}`}
                      style={{ height: gridHeight, backgroundImage: "linear-gradient(to bottom, var(--border) 1px, transparent 1px)", backgroundSize: `100% ${HOUR_HEIGHT}px` }}>
                      {calendarLayoutItems(blocks, value).map(({ item, from, to, lane, lanes }) => {
                        const isSlot = item.kind === "slot";
                        const key = isSlot ? `slot-${item.slot.doctorId}-${item.start}` : item.event.id;
                        const label = isSlot ? `Livre · ${item.slot.doctorName}` : item.event.title;
                        const status = isSlot ? "Solicitar este horário" : STATUS_LABELS[item.event.status];
                        const className = isSlot ? "border-dashed border-emerald-300 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100" :
                          item.event.status === "CANCELLED" || item.event.status === "RESCHEDULED" ? "border-slate-200 bg-slate-100 text-slate-500" : COLORS[colorIndex(item.event.doctorId)];
                        return (
                          <button type="button" key={key}
                            onClick={() => {
                              if (isSlot) onSelectSlot?.(item.slot);
                              else { setSelectedEventId(item.event.id); onSelectEvent?.(item.event); }
                            }}
                            aria-label={`${label}, ${calendarDayLabel(value, { day: "numeric", month: "long" })}, ${calendarTimeLabel(item.start)} às ${calendarTimeLabel(item.end)}, ${status}`}
                            aria-pressed={!isSlot && selectedEventId === item.event.id}
                            title={`${label}\n${calendarTimeLabel(item.start)}–${calendarTimeLabel(item.end)} · ${status}`}
                            className={`absolute overflow-hidden rounded-lg border p-1.5 text-left text-[11px] leading-tight transition focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${className} ${!isSlot && selectedEventId === item.event.id ? "z-10 ring-2 ring-teal-600 ring-offset-1" : ""}`}
                            style={{ top: (from - firstMinute) / 60 * HOUR_HEIGHT + 3,
                              height: Math.max(22, (to - from) / 60 * HOUR_HEIGHT - 6),
                              left: `calc(${lane * 100 / lanes}% + 4px)`, width: `calc(${100 / lanes}% - 8px)` }}>
                            <span className="block truncate font-semibold">{isSlot ? "Horário livre" : item.event.title}</span>
                            <span className="block truncate">{calendarTimeLabel(item.start)} · {isSlot ? item.slot.doctorName : item.event.subtitle ?? status}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Horários de Brasília · {visibleEvents.length} consulta{visibleEvents.length === 1 ? "" : "s"} no período</span>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={showCancelled} onChange={(event) => setShowCancelled(event.target.checked)} className="accent-teal-700" />
              Mostrar canceladas e remarcadas
            </label>
          </div>
          {!loading && !error && visibleEvents.length === 0 && slots.length === 0 &&
            <p role="status" className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">Nenhuma consulta ou horário livre neste período. Use as setas para navegar.</p>}
          <p className="text-xs text-slate-400 md:hidden">Deslize a grade para os lados ou escolha a visualização Dia.</p>
        </div>

        <aside className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1" aria-label="Navegação e filtros da agenda">
          <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Escolher uma data">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold capitalize text-slate-800">{calendarDayLabel(month, { month: "long", year: "numeric" })}</p>
              <div className="flex gap-1">
                <button type="button" aria-label="Mês anterior" onClick={() => setMonth(calendarShiftMonth(month, -1))} className="rounded p-1 hover:bg-slate-100"><ChevronLeft className="size-4 text-slate-400" /></button>
                <button type="button" aria-label="Próximo mês" onClick={() => setMonth(calendarShiftMonth(month, 1))} className="rounded p-1 hover:bg-slate-100"><ChevronRight className="size-4 text-slate-400" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {WEEKDAY_LABELS.map((label, index) => <span key={index} className="py-1 text-[10px] uppercase text-slate-400">{label}</span>)}
              {calendarMonthDays(month).map((value) => (
                <button type="button" key={value} onClick={() => selectDay(value)} aria-pressed={value === day}
                  aria-label={`Escolher ${calendarDayLabel(value, { day: "numeric", month: "long", year: "numeric" })}`}
                  className={`mx-auto flex size-7 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-teal-600 ${value === day ? "bg-primary font-semibold text-primary-foreground" : value === today ? "bg-teal-50 font-semibold text-teal-800" : value.slice(0, 7) !== month.slice(0, 7) ? "text-slate-300 hover:bg-slate-50" : "text-slate-600 hover:bg-slate-100"}`}>
                  {Number(value.slice(-2))}
                </button>
              ))}
            </div>
          </section>

          {doctors && onDoctorChange && <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Profissionais</h3>
            <div className="space-y-1" role="group" aria-label="Filtrar por profissional">
              {[{ id: "", name: "Todos" }, ...doctors].map((doctor) => (
                <button type="button" key={doctor.id} aria-pressed={selectedDoctorId === doctor.id}
                  onClick={() => onDoctorChange(doctor.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${selectedDoctorId === doctor.id ? "bg-slate-100 font-semibold text-slate-900" : "text-slate-500 hover:bg-slate-50"}`}>
                  <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${doctor.id ? DOT_COLORS[colorIndex(doctor.id)] : "bg-slate-400"}`} />
                  <span className="truncate">{doctor.name}</span>
                </button>
              ))}
            </div>
          </section>}

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-800">Resumo do dia</h3>
            <p className="mt-1 text-xs text-slate-400">{calendarDayLabel(day, { day: "numeric", month: "long" })}</p>
            {loading ? <p className="mt-3 text-xs text-slate-500">Carregando...</p> : error ?
              <p className="mt-3 text-xs text-slate-500">Resumo indisponível.</p> : <dl className="mt-4 space-y-3 text-xs">
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Consultas</dt><dd className="font-semibold text-slate-900">{selectedDayEvents.length}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-slate-500">Confirmadas</dt><dd className="font-semibold text-slate-900">{selectedDayEvents.filter((event) => event.status === "CONFIRMED").length}</dd></div>
                {onSelectSlot && <div className="flex justify-between gap-2"><dt className="text-slate-500">Horários livres</dt><dd className="font-semibold text-emerald-700">{selectedDaySlots.length}</dd></div>}
              </dl>}
            <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-400"><Clock3 className="mt-0.5 size-3 shrink-0" /> Clique em uma consulta para ver os detalhes{onSelectSlot ? " ou em um horário livre para solicitar atendimento." : "."}</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
