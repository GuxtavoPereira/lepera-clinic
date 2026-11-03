import type { GooglePreviewSession } from "@lepera/contracts";
import { ApiError } from "./api-client";
import type { CalendarSlot } from "./calendar";
const KEY = "lepera:google-preview";
const SLOT_KEY = "lepera:requested-slot";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

/** Preview credentials never enter the full account session storage. */
export async function previewFetch<T>(
  path: string,
  init?: RequestInit,
  token?: string,
): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body: { message?: unknown } | null = await res
      .json()
      .catch(() => null);
    throw new ApiError(
      res.status,
      typeof body?.message === "string"
        ? body.message
        : "Não foi possível consultar. Tente novamente.",
    );
  }
  return res.json() as Promise<T>;
}
export function storePreview(session: GooglePreviewSession) {
  sessionStorage.setItem(KEY, JSON.stringify(session));
}
export function clearPreview() {
  sessionStorage.removeItem(KEY);
}
export function readPreview(): GooglePreviewSession | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(
      sessionStorage.getItem(KEY) ?? "null",
    ) as GooglePreviewSession | null;
    if (
      s &&
      typeof s.accessToken === "string" &&
      typeof s.profile?.name === "string" &&
      typeof s.profile.email === "string" &&
      Date.parse(s.expiresAt) > Date.now()
    )
      return s;
  } catch {
    /* Expired/corrupted preview is discarded, never used as a full login. */
  }
  clearPreview();
  return null;
}
export function saveRequestedSlot(slot: CalendarSlot) {
  sessionStorage.setItem(SLOT_KEY, JSON.stringify(slot));
}
export function requestedSlotPath() {
  try {
    const slot = JSON.parse(
      sessionStorage.getItem(SLOT_KEY) ?? "null",
    ) as CalendarSlot | null;
    sessionStorage.removeItem(SLOT_KEY);
    if (
      slot &&
      typeof slot.doctorId === "string" &&
      typeof slot.start === "string" &&
      Date.parse(slot.start) > Date.now()
    ) {
      const date = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(slot.start));
      const time = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(slot.start));
      return `/patient/request-appointment?${new URLSearchParams({ date, time, doctorId: slot.doctorId })}`;
    }
  } catch {
    sessionStorage.removeItem(SLOT_KEY);
  }
  return "/patient/request-appointment";
}
