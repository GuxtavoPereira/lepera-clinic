"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calendarDateKey,
  calendarDayLabel,
  calendarIntervalOnDay,
  calendarLayoutItems,
  calendarMonthDays,
  calendarRangeForDate,
  calendarShiftDate,
  calendarShiftMonth,
  calendarTimeLabel,
  type CalendarEvent,
  type CalendarRange,
  type CalendarSlot,
  type CalendarView,
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

type CalendarBlock =
  | {
      start: string;
      end: string;
      kind: "event";
      event: CalendarEvent;
    }
  | {
      start: string;
      end: string;
      kind: "slot";
      slot: CalendarSlot;
    };

const NEUTRAL_COLOR = "var(--color-slate-400)";
const CALENDAR_BLOCK_COLORS =
  "[border-color:var(--calendar-color)] [background-color:color-mix(in_oklab,var(--calendar-color)_16%,var(--card))] shadow-[inset_3px_0_var(--calendar-color)] hover:[background-color:color-mix(in_oklab,var(--calendar-color)_26%,var(--card))]";
const STATUS_LABELS: Record<CalendarEvent["status"], string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Remarcada",
  WAITING: "Aguardando",
};
const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOUR_HEIGHT = 76;
const HOUR_COLUMN_WIDTH = 56;
const MIN_LANE_WIDTH = 72;
const EMPTY_SLOTS: CalendarSlot[] = [];
const compactQuery = "(max-width: 639px)";
function subscribeCompact(callback: () => void) {
  const query = window.matchMedia(compactQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const compactSnapshot = () => window.matchMedia(compactQuery).matches;

export function AppointmentCalendar({
  events,
  slots = EMPTY_SLOTS,
  loading = false,
  error,
  onRangeChange,
  onSelectEvent,
  onSelectSlot,
  doctors,
  selectedDoctorId = "",
  onDoctorChange,
  title = "Agenda",
}: Props) {
  const [day, setDay] = useState(() => calendarDateKey(new Date()));
  const compact = useSyncExternalStore(
    subscribeCompact,
    compactSnapshot,
    () => false,
  );
  const [chosenView, setView] = useState<CalendarView | null>(null);
  const view = chosenView ?? (compact ? "day" : "week");
  const dateInputId = useId();
  const [month, setMonth] = useState(() => calendarDateKey(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const showsAppointments = onSelectEvent !== undefined || events.length > 0;
  const today = calendarDateKey(new Date());
  const range = calendarRangeForDate(day, view);

  useEffect(() => {
    onRangeChange?.({ from: range.from, to: range.to });
  }, [range.from, range.to, onRangeChange]);

  const days = Array.from({ length: view === "week" ? 7 : 1 }, (_, index) =>
    calendarShiftDate(range.from, index),
  );
  const visibleEvents = events.filter(
    (event) =>
      (showCancelled ||
        (event.status !== "CANCELLED" && event.status !== "RESCHEDULED")) &&
      days.some((value) =>
        calendarIntervalOnDay(event.start, event.end, value),
      ),
  );
  const blocks = useMemo<CalendarBlock[]>(
    () => [
      ...events
        .filter(
          (event) =>
            showCancelled ||
            (event.status !== "CANCELLED" && event.status !== "RESCHEDULED"),
        )
        .map((event): CalendarBlock => ({
          kind: "event",
          event,
          start: event.start,
          end: event.end,
        })),
      ...slots.map((slot): CalendarBlock => ({
        kind: "slot",
        slot,
        start: slot.start,
        end: slot.end,
      })),
    ],
    [events, slots, showCancelled],
  );
  const dayLayouts = days.map((value) => ({
    value,
    items: calendarLayoutItems(blocks, value),
  }));
  const intervals = dayLayouts.flatMap(({ items }) => items);
  const dayWidths = dayLayouts.map(({ items }) =>
    Math.max(88, ...items.map(({ lanes }) => lanes * MIN_LANE_WIDTH)),
  );
  const gridTemplateColumns = `${HOUR_COLUMN_WIDTH}px ${dayWidths
    .map((width) => `minmax(${width}px, 1fr)`)
    .join(" ")}`;
  const gridMinWidth = Math.max(
    view === "week" ? 680 : 280,
    HOUR_COLUMN_WIDTH + dayWidths.reduce((total, width) => total + width, 0),
  );
  const firstMinute =
    Math.floor(Math.min(8 * 60, ...intervals.map((item) => item.from)) / 60) *
    60;
  const lastMinute =
    Math.ceil(Math.max(18 * 60, ...intervals.map((item) => item.to)) / 60) * 60;
  const gridHeight = ((lastMinute - firstMinute) / 60) * HOUR_HEIGHT;
  const hours = Array.from(
    { length: (lastMinute - firstMinute) / 60 },
    (_, index) => firstMinute / 60 + index,
  );
  const doctorIds = new Set([
    ...(doctors?.map(({ id }) => id).sort() ?? []),
    ...[
      ...events.map(({ doctorId }) => doctorId ?? ""),
      ...slots.map(({ doctorId }) => doctorId),
    ].sort(),
  ]);
  const doctorColors = new Map(
    [...doctorIds].filter(Boolean).map((id, index) => {
      // Space consecutive colors around the hue wheel to distinguish adjacent cards.
      const hue = (185 + index * 137.508) % 360;
      return [id, `oklch(0.67 0.16 ${hue.toFixed(2)})`];
    }),
  );
  const selectedDayEvents = visibleEvents.filter((event) =>
    calendarIntervalOnDay(event.start, event.end, day),
  );
  const selectedDaySlots = slots.filter(
    (slot) => calendarDateKey(slot.start) === day,
  );

  function selectDay(value: string) {
    setDay(value);
    setMonth(value);
    setSelectedEventId(null);
  }

  return (
    <section aria-label={title} className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Período anterior"
            disabled={loading}
            onClick={() =>
              selectDay(calendarShiftDate(day, view === "week" ? -7 : -1))
            }
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11 shrink-0"
            aria-label="Próximo período"
            disabled={loading}
            onClick={() =>
              selectDay(calendarShiftDate(day, view === "week" ? 7 : 1))
            }
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => selectDay(today)}
            disabled={loading}
          >
            Hoje
          </Button>
          <p
            className="w-full text-sm font-semibold capitalize text-foreground sm:ml-1 sm:w-auto"
            aria-live="polite"
          >
            {view === "day"
              ? calendarDayLabel(day, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : `${calendarDayLabel(range.from, { day: "2-digit", month: "short" })} – ${calendarDayLabel(calendarShiftDate(range.to, -1), { day: "2-digit", month: "short", year: "numeric" })}`}
          </p>
        </div>
        <div
          className="flex w-fit rounded-lg border border-slate-200 bg-white p-1"
          aria-label="Visualização da agenda"
        >
          {(["week", "day"] as const).map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={`min-h-11 rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${view === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-slate-50"}`}
            >
              {option === "week" ? "Semana" : "Dia"}
            </button>
          ))}
        </div>
      </div>

      <div className="sm:hidden">
        <label
          htmlFor={dateInputId}
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Escolher data
        </label>
        <input
          id={dateInputId}
          type="date"
          value={day}
          onChange={(event) => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value))
              selectDay(event.target.value);
          }}
          className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-foreground"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {doctors && onDoctorChange && doctors.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <h3 className="mb-2 text-sm font-semibold">Profissionais</h3>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por profissional">
            {[{ id: "", name: "Todos" }, ...doctors].map((doctor) => (
              <button
                type="button"
                key={doctor.id}
                aria-pressed={selectedDoctorId === doctor.id}
                onClick={() => onDoctorChange(doctor.id)}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg border border-border px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:border-primary/50 aria-pressed:bg-primary/10"
              >
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: doctorColors.get(doctor.id) ?? NEUTRAL_COLOR }}
                />
                <span className="min-w-0 wrap-break-word">{doctor.name}</span>
              </button>
            ))}
          </div>
          {onSelectSlot && (
            <p className="mt-2 text-xs text-muted-foreground">
              A cor identifica o profissional. O contorno tracejado marca um horário livre.
            </p>
          )}
        </section>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-3">
          {view === "week" && (
            <p className="text-xs text-muted-foreground">
              Escolha Dia para ampliar os horários ou deslize a grade para os lados.
            </p>
          )}
          {view === "day" && gridMinWidth > 280 && (
            <p className="text-xs text-muted-foreground sm:hidden">
              Deslize a grade para ver os horários simultâneos.
            </p>
          )}
          <div
            className="overflow-x-auto rounded-2xl border border-slate-200 bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            role="region"
            aria-label="Grade de horários"
            tabIndex={0}
            aria-busy={loading}
          >
            {loading ? (
              <div
                role="status"
                className="flex min-h-96 items-center justify-center gap-2 text-sm text-muted-foreground"
              >
                <CalendarDays className="size-5 animate-pulse" /> Carregando
                agenda...
              </div>
            ) : error && blocks.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                A agenda não pôde ser atualizada. Tente novamente.
              </p>
            ) : (
              <div style={{ minWidth: gridMinWidth }}>
                <div
                  className="grid border-b border-slate-100"
                  style={{ gridTemplateColumns }}
                >
                  <div className="border-r border-slate-100" />
                  {days.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => selectDay(value)}
                      aria-pressed={value === day}
                      aria-label={calendarDayLabel(value, {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                      className={`flex flex-col items-center gap-1 border-r border-slate-100 px-1 py-3 text-xs last:border-r-0 hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-teal-600 ${value === day ? "bg-teal-50/50" : ""}`}
                    >
                      <span className="uppercase text-muted-foreground">
                        {calendarDayLabel(value, { weekday: "short" }).replace(
                          ".",
                          "",
                        )}
                      </span>
                      <span
                        aria-current={value === today ? "date" : undefined}
                        className={`flex size-8 items-center justify-center rounded-full text-base font-semibold ${value === today ? "bg-primary text-primary-foreground" : value === day ? "bg-teal-100 text-teal-800" : "text-foreground"}`}
                      >
                        {Number(value.slice(-2))}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  className="grid"
                  style={{ gridTemplateColumns }}
                >
                  <div
                    className="relative border-r border-slate-100"
                    style={{ height: gridHeight }}
                  >
                    {hours.map((hour, index) => (
                      <span
                        key={hour}
                        className="absolute right-2 text-[10px] text-muted-foreground"
                        style={{ top: index * HOUR_HEIGHT + 5 }}
                      >
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {dayLayouts.map(({ value, items }) => (
                    <div
                      key={value}
                      className={`relative border-r border-slate-100 last:border-r-0 ${value === day ? "bg-teal-50/15" : ""}`}
                      style={{
                        height: gridHeight,
                        backgroundImage:
                          "linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
                        backgroundSize: `100% ${HOUR_HEIGHT}px`,
                      }}
                    >
                      {items.map(
                        ({ item, from, to, lane, lanes }) => {
                          const isSlot = item.kind === "slot";
                          const key = isSlot
                            ? `slot-${item.slot.doctorId}-${item.start}`
                            : item.event.id;
                          const label = isSlot
                            ? `Livre · ${item.slot.doctorName}`
                            : [item.event.title, item.event.subtitle].filter(Boolean).join(" · ");
                          const status = isSlot
                            ? "Solicitar este horário"
                            : STATUS_LABELS[item.event.status];
                          const cancelled = !isSlot && (
                            item.event.status === "CANCELLED" || item.event.status === "RESCHEDULED"
                          );
                          const doctorId = isSlot ? item.slot.doctorId : item.event.doctorId;
                          const color = cancelled
                            ? NEUTRAL_COLOR
                            : (doctorColors.get(doctorId ?? "") ?? NEUTRAL_COLOR);
                          const time = calendarTimeLabel(item.start);
                          return (
                            <button
                              type="button"
                              key={key}
                              onClick={() => {
                                if (isSlot) onSelectSlot?.(item.slot);
                                else {
                                  setSelectedEventId(item.event.id);
                                  onSelectEvent?.(item.event);
                                }
                              }}
                              aria-label={`${label}, ${calendarDayLabel(value, { day: "numeric", month: "long" })}, ${time} às ${calendarTimeLabel(item.end)}, ${status}`}
                              aria-pressed={
                                isSlot ? undefined : selectedEventId === item.event.id
                              }
                              title={`${label}\n${time}–${calendarTimeLabel(item.end)} · ${status}`}
                              className={`absolute overflow-hidden rounded-lg border py-1 pr-1 pl-2 text-left text-xs leading-tight transition focus-visible:z-20 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700 ${CALENDAR_BLOCK_COLORS} ${isSlot ? "border-dashed" : ""} ${cancelled ? "text-muted-foreground" : "text-foreground"} ${!isSlot && selectedEventId === item.event.id ? "z-10 ring-2 ring-teal-600 ring-offset-1" : ""}`}
                              style={{
                                "--calendar-color": color,
                                top:
                                  ((from - firstMinute) / 60) * HOUR_HEIGHT + 3,
                                height: Math.max(
                                  22,
                                  ((to - from) / 60) * HOUR_HEIGHT - 6,
                                ),
                                left: `calc(${(lane * 100) / lanes}% + 4px)`,
                                width: `calc(${100 / lanes}% - 8px)`,
                              } as CSSProperties}
                            >
                              <span className="block truncate font-semibold tabular-nums">
                                {isSlot ? time : item.event.title}
                              </span>
                              <span className="block truncate text-[11px]">
                                {isSlot
                                  ? item.slot.doctorName.replace(/^dr(?:a)?\.?\s+/i, "")
                                  : `${time} · ${item.event.subtitle ?? status}`}
                              </span>
                            </button>
                          );
                        },
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Horários de Brasília
              {showsAppointments && ` · ${visibleEvents.length} ${visibleEvents.length === 1 ? "consulta" : "consultas"}`}
              {onSelectSlot && ` · ${slots.length} ${slots.length === 1 ? "horário livre" : "horários livres"}`}
            </span>
            {showsAppointments && (
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={showCancelled}
                  onChange={(event) => setShowCancelled(event.target.checked)}
                  className="accent-teal-700"
                />
                Mostrar canceladas e remarcadas
              </label>
            )}
          </div>
          {!loading &&
            !error &&
            visibleEvents.length === 0 &&
            slots.length === 0 && (
              <p
                role="status"
                className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-sm text-muted-foreground"
              >
                Nenhuma consulta ou horário livre neste período. Use as setas
                para navegar.
              </p>
            )}
        </div>

        <aside
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1"
          aria-label="Navegação e filtros da agenda"
        >
          <section
            className="rounded-2xl border border-slate-200 bg-white p-4"
            aria-label="Escolher uma data"
            hidden={compact}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold capitalize text-foreground">
                {calendarDayLabel(month, { month: "long", year: "numeric" })}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  onClick={() => setMonth(calendarShiftMonth(month, -1))}
                  className="rounded p-1 hover:bg-slate-100"
                >
                  <ChevronLeft className="size-4 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  onClick={() => setMonth(calendarShiftMonth(month, 1))}
                  className="rounded p-1 hover:bg-slate-100"
                >
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
              {WEEKDAY_LABELS.map((label, index) => (
                <span
                  key={index}
                  className="py-1 text-[10px] uppercase text-muted-foreground"
                >
                  {label}
                </span>
              ))}
              {calendarMonthDays(month).map((value) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => selectDay(value)}
                  aria-pressed={value === day}
                  aria-label={`Escolher ${calendarDayLabel(value, { day: "numeric", month: "long", year: "numeric" })}`}
                  className={`mx-auto flex size-7 items-center justify-center rounded-full transition focus-visible:outline-2 focus-visible:outline-teal-600 ${value === day ? "bg-primary font-semibold text-primary-foreground" : value === today ? "bg-teal-50 font-semibold text-teal-800" : value.slice(0, 7) !== month.slice(0, 7) ? "text-slate-300 hover:bg-slate-50" : "text-foreground hover:bg-slate-100"}`}
                >
                  {Number(value.slice(-2))}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Resumo do dia
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {calendarDayLabel(day, { day: "numeric", month: "long" })}
            </p>
            {loading ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Carregando...
              </p>
            ) : error ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Resumo indisponível.
              </p>
            ) : (
              <dl className="mt-4 space-y-3 text-xs">
                {showsAppointments && (
                  <>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Consultas</dt>
                      <dd className="font-semibold text-foreground">
                        {selectedDayEvents.length}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Confirmadas</dt>
                      <dd className="font-semibold text-foreground">
                        {
                          selectedDayEvents.filter(
                            (event) => event.status === "CONFIRMED",
                          ).length
                        }
                      </dd>
                    </div>
                  </>
                )}
                {onSelectSlot && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Horários livres</dt>
                    <dd className="font-semibold text-emerald-700">
                      {selectedDaySlots.length}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <Clock3 aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
              {onSelectSlot
                ? "Selecione um horário livre para solicitar atendimento."
                : "Selecione uma consulta para ver os detalhes."}
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
