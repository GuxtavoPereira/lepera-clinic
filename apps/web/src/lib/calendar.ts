import type { AppointmentStatus } from "@lepera/contracts";

export const CALENDAR_TIME_ZONE = "America/Sao_Paulo";
export type CalendarRange = { from: string; to: string };
export type CalendarView = "week" | "day";
export type CalendarEvent = {
  id: string;
  start: string;
  end: string;
  title: string;
  subtitle?: string;
  status: AppointmentStatus;
  doctorId?: string;
  href?: string;
};
export type CalendarSlot = {
  doctorId: string;
  doctorName: string;
  start: string;
  end: string;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CALENDAR_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: CALENDAR_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function calendarDateKey(value: string | Date): string {
  const parts = dateFormatter.formatToParts(new Date(value));
  const field = (name: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === name)?.value ?? "";
  return `${field("year")}-${field("month")}-${field("day")}`;
}

export function calendarTimeLabel(value: string | Date): string {
  return timeFormatter.format(new Date(value));
}

export function calendarShiftDate(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calendarRangeForDate(day: string, view: CalendarView): CalendarRange {
  if (view === "day") return { from: day, to: calendarShiftDate(day, 1) };
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  const from = calendarShiftDate(day, -((weekday + 6) % 7));
  return { from, to: calendarShiftDate(from, 7) };
}

export function calendarDayLabel(day: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" })
    .format(new Date(`${day}T12:00:00Z`));
}

export function calendarMonthDays(day: string): string[] {
  const start = calendarRangeForDate(`${day.slice(0, 7)}-01`, "week").from;
  return Array.from({ length: 42 }, (_, index) => calendarShiftDate(start, index));
}

export function calendarShiftMonth(day: string, months: number): string {
  const date = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function calendarMinuteOfDay(value: string): number {
  const [hours, minutes] = calendarTimeLabel(value).split(":").map(Number);
  return hours * 60 + minutes;
}

export function calendarIntervalOnDay(start: string, end: string, day: string) {
  const startDay = calendarDateKey(start);
  const endDay = calendarDateKey(end);
  if (startDay > day || endDay < day || new Date(end) <= new Date(start)) return null;
  const from = startDay < day ? 0 : calendarMinuteOfDay(start);
  const to = endDay > day ? 1440 : calendarMinuteOfDay(end);
  return to > from ? { from, to } : null;
}

export type PositionedCalendarItem<T> = {
  item: T;
  from: number;
  to: number;
  lane: number;
  lanes: number;
};

/** Partition overlapping appointments into lanes without hiding concurrent professionals. */
export function calendarLayoutItems<T extends { start: string; end: string }>(
  items: T[], day: string,
): PositionedCalendarItem<T>[] {
  const sorted = items.flatMap((item) => {
    const interval = calendarIntervalOnDay(item.start, item.end, day);
    return interval ? [{ item, ...interval }] : [];
  }).sort((a, b) => a.from - b.from || b.to - a.to);
  const result: PositionedCalendarItem<T>[] = [];
  let group: PositionedCalendarItem<T>[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;
  const finish = () => {
    for (const entry of group) entry.lanes = laneEnds.length;
    result.push(...group);
    group = [];
    laneEnds = [];
  };
  for (const entry of sorted) {
    if (group.length && entry.from >= groupEnd) finish();
    let lane = laneEnds.findIndex((end) => end <= entry.from);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = entry.to;
    group.push({ ...entry, lane, lanes: 1 });
    groupEnd = group.length === 1 ? entry.to : Math.max(groupEnd, entry.to);
  }
  finish();
  return result;
}
