"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api-client";
import {
  calendarDateKey,
  calendarShiftDate,
  CALENDAR_TIME_ZONE,
} from "@/lib/calendar";

export type DashboardAppointment = {
  id: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes?: number;
  modality: "IN_PERSON" | "ONLINE";
  status: string;
  doctor?: { user: { name: string } };
  patient?: { user: { name: string } };
};
export type DashboardResource<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};
export type DashboardLoader<T> = (signal: AbortSignal) => Promise<T>;

/** Each section resolves independently, so one unavailable endpoint does not hide the rest. */
export function useDashboardResource<T>(
  loader: DashboardLoader<T>,
): DashboardResource<T> {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: true, error: null });
  useEffect(() => {
    const controller = new AbortController();
    void loader(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            data: null,
            loading: false,
            error:
              error instanceof ApiError
                ? error.message
                : "Não foi possível carregar os dados.",
          });
      });
    return () => controller.abort();
  }, [loader, revision]);
  const refresh = useCallback(() => {
    setState({ data: null, loading: true, error: null });
    setRevision((value) => value + 1);
  }, []);
  return { ...state, refresh };
}

export const isCurrentAppointment = (item: DashboardAppointment) =>
  !["CANCELLED", "RESCHEDULED"].includes(item.status);
export const isOpenAppointment = (item: DashboardAppointment) =>
  ["SCHEDULED", "CONFIRMED", "WAITING"].includes(item.status);

export async function loadTodayAppointments(signal: AbortSignal) {
  const from = calendarDateKey(new Date());
  const to = calendarShiftDate(from, 1);
  const result = await apiFetch<{ items: DashboardAppointment[] }>(
    `/appointments/calendar?from=${from}&to=${to}`,
    { signal },
  );
  return result.items
    .filter(isCurrentAppointment)
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));
}

export async function loadOwnAppointments(signal: AbortSignal) {
  const items = await apiFetch<DashboardAppointment[]>("/appointments/mine", {
    signal,
  });
  const now = Date.now();
  const next = items
    .filter(
      (item) =>
        isOpenAppointment(item) && new Date(item.endDatetime).getTime() > now,
    )
    .sort((a, b) => a.startDatetime.localeCompare(b.startDatetime));
  return { items, next };
}

const dashboardFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: CALENDAR_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export const dashboardDateTime = (value: string) =>
  dashboardFormatter.format(new Date(value));

export function dashboardValue<T>(
  resource: DashboardResource<T>,
  select: (value: T) => number,
): number | string {
  return resource.loading
    ? "…"
    : resource.data !== null
      ? select(resource.data)
      : "—";
}

export function appointmentDuration(item: DashboardAppointment) {
  return (
    item.durationMinutes ??
    Math.round(
      (new Date(item.endDatetime).getTime() -
        new Date(item.startDatetime).getTime()) /
        60000,
    )
  );
}
