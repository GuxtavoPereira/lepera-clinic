"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { GooglePreviewSession, PreviewDoctor } from "@lepera/contracts";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import { GooglePreviewButton } from "@/components/auth/google-preview-button";
import { Button } from "@/components/ui/button";
import {
  clearPreview,
  previewFetch,
  readPreview,
  saveRequestedSlot,
} from "@/lib/google-preview";
import {
  calendarDayLabel,
  calendarTimeLabel,
  type CalendarRange,
  type CalendarSlot,
} from "@/lib/calendar";
import { ApiError } from "@/lib/api-client";

export default function ExploreCalendarPage() {
  const [session, setSession] = useState<GooglePreviewSession | null>(null);
  const [ready, setReady] = useState(false);
  const [doctors, setDoctors] = useState<PreviewDoctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [range, setRange] = useState<CalendarRange | null>(null);
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [selected, setSelected] = useState<CalendarSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onRangeChange = useCallback(
    (next: CalendarRange) =>
      setRange((current) =>
        current?.from === next.from && current.to === next.to ? current : next,
      ),
    [],
  );
  const onLogin = useCallback((s: GooglePreviewSession) => setSession(s), []);
  useEffect(() => {
    void Promise.resolve().then(() => {
      setSession(readPreview());
      setReady(true);
      const doctor = new URLSearchParams(window.location.search).get(
        "doctorId",
      );
      if (doctor && doctor.length <= 100) setDoctorId(doctor);
    });
  }, []);
  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(
      () => {
        clearPreview();
        setSession(null);
        setSlots([]);
      },
      Math.max(0, Date.parse(session.expiresAt) - Date.now()),
    );
    let active = true;
    previewFetch<{ items: PreviewDoctor[] }>(
      "/preview/doctors",
      undefined,
      session.accessToken,
    )
      .then((r) => {
        if (active) setDoctors(r.items);
      })
      .catch((e: unknown) => {
        if (active && e instanceof ApiError && e.status === 401) {
          clearPreview();
          setSession(null);
        } else if (active)
          setError("Não foi possível carregar os profissionais.");
      });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [session]);
  useEffect(() => {
    if (!session || !range) return;
    const abort = new AbortController();
    void Promise.resolve().then(() => {
      if (!abort.signal.aborted) {
        setLoading(true);
        setError(null);
        setSelected(null);
      }
    });
    const query = new URLSearchParams({
      from: range.from,
      to: range.to,
      ...(doctorId ? { doctorId } : {}),
    });
    previewFetch<{ items: CalendarSlot[] }>(
      `/preview/slots?${query}`,
      { signal: abort.signal },
      session.accessToken,
    )
      .then((r) => {
        if (!abort.signal.aborted) setSlots(r.items);
      })
      .catch((e: unknown) => {
        if (abort.signal.aborted) return;
        setSlots([]);
        if (e instanceof ApiError && e.status === 401) {
          clearPreview();
          setSession(null);
        } else
          setError(
            "Não foi possível carregar horários. Mude a data para tentar novamente.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [session, range, doctorId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
      <div>
        <h1 className="text-3xl font-bold">
          Encontre um horário para cuidar de você
        </h1>
        <p className="mt-2 text-muted-foreground">
          Consulte a disponibilidade dos nossos psicólogos. A confirmação da
          consulta é feita pela recepção.
        </p>
      </div>
      {!ready ? (
        <p role="status">Carregando…</p>
      ) : !session ? (
        <div className="mx-auto max-w-lg rounded-2xl border bg-card p-6">
          <GooglePreviewButton onSuccess={onLogin} />
          <p className="mt-6 text-center text-sm">
            Já tem cadastro?{" "}
            <Link
              href="/auth/login?next=/patient/request-appointment"
              className="text-primary underline"
            >
              Entrar na minha conta
            </Link>
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
            <p className="text-sm">
              Olá, <strong>{session.profile.name}</strong>. Você está
              consultando horários livres.
            </p>
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => {
                clearPreview();
                setSession(null);
                setSlots([]);
                setSelected(null);
              }}
            >
              Sair da consulta Google
            </Button>
          </div>
          {selected && (
            <div
              role="status"
              className="rounded-xl border border-primary/30 bg-primary/5 p-5"
            >
              <h2 className="font-semibold">{selected.doctorName}</h2>
              <p className="mt-1 text-sm">
                {calendarDayLabel(selected.start.slice(0, 10), {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                às {calendarTimeLabel(selected.start)} · 50 minutos
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Complete o cadastro para solicitar este horário. Ele será
                conferido novamente ao enviar e ao aprovar.
              </p>
              <Button
                render={<Link href="/auth/register" />}
                className="mt-4 min-h-11"
                onClick={() => saveRequestedSlot(selected)}
              >
                Completar cadastro e solicitar
              </Button>
            </div>
          )}
          <AppointmentCalendar
            events={[]}
            slots={slots}
            loading={loading}
            error={error}
            onRangeChange={onRangeChange}
            onSelectSlot={setSelected}
            doctors={doctors}
            selectedDoctorId={doctorId}
            onDoctorChange={setDoctorId}
            title="Horários disponíveis"
          />
        </>
      )}
    </div>
  );
}
