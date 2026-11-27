"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarPlus,
  DoorOpen,
  Loader2,
  Plus,
  RotateCw,
  Settings2,
  X,
} from "lucide-react";
import {
  roomReservationStatusLabels,
  type RoomReservationStatus,
} from "@lepera/contracts";
import { AppointmentCalendar } from "@/components/appointments/appointment-calendar";
import {
  Alert,
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { getCurrentUser } from "@/lib/auth";
import {
  calendarDateKey,
  calendarTimeLabel,
  type CalendarEvent,
  type CalendarRange,
} from "@/lib/calendar";
import { useRole } from "@/lib/use-role";

type ClinicRoom = {
  id: string;
  name: string;
  location: string | null;
  capacity: number;
  notes: string | null;
  isActive: boolean;
};

type RoomReservation = {
  id: string;
  roomId: string;
  reservedById: string;
  appointmentId: string | null;
  title: string;
  notes: string | null;
  startDatetime: string;
  endDatetime: string;
  status: RoomReservationStatus;
  cancelReason: string | null;
  room: { id: string; name: string; location: string | null; isActive: boolean };
  reservedBy: { id: string; name: string; role: string };
};

export default function RoomsCalendarPage() {
  const role = useRole();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const currentUserId = getCurrentUser()?.sub ?? null;

  const [rooms, setRooms] = useState<ClinicRoom[]>([]);
  const [roomFilter, setRoomFilter] = useState("");
  const [range, setRange] = useState<CalendarRange | null>(null);
  const rangeKey = useRef("");
  const [reservations, setReservations] = useState<RoomReservation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Modal de nova reserva
  const [reserveOpen, setReserveOpen] = useState(false);
  const [resRoomId, setResRoomId] = useState("");
  const [resDate, setResDate] = useState(() => calendarDateKey(new Date()));
  const [resStart, setResStart] = useState("09:00");
  const [resEnd, setResEnd] = useState("09:50");
  const [resTitle, setResTitle] = useState("");
  const [resNotes, setResNotes] = useState("");
  const [resSubmitting, setResSubmitting] = useState(false);
  const [resError, setResError] = useState<string | null>(null);

  // Modal de gerenciar salas (admin)
  const [manageOpen, setManageOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomLocation, setRoomLocation] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("2");
  const [roomNotes, setRoomNotes] = useState("");
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  // Cancelamento de reserva
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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
    void apiFetch<ClinicRoom[]>(
      `/rooms${isAdmin ? "?includeInactive=true" : ""}`,
    )
      .then((items) => {
        if (active) setRooms(items);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível carregar as salas.",
        );
      });
    return () => {
      active = false;
    };
  }, [isAdmin, reloadKey]);

  useEffect(() => {
    if (!range) return;
    let active = true;
    const params = new URLSearchParams({ from: range.from, to: range.to });
    if (roomFilter) params.set("roomId", roomFilter);
    void apiFetch<{ items: RoomReservation[] }>(`/rooms/calendar?${params}`)
      .then(({ items }) => {
        if (active) {
          setReservations(items);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setReservations([]);
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível carregar as reservas de salas.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range, roomFilter, reloadKey]);

  function reload() {
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  async function handleReserve(event: React.FormEvent) {
    event.preventDefault();
    if (resSubmitting) return;
    if (!resRoomId) {
      setResError("Selecione uma sala disponível.");
      return;
    }
    if (resTitle.trim().length < 2) {
      setResError("Informe o motivo ou título da reserva.");
      return;
    }
    setResSubmitting(true);
    setResError(null);
    try {
      await apiFetch("/rooms/reservations", {
        method: "POST",
        body: JSON.stringify({
          roomId: resRoomId,
          title: resTitle.trim(),
          notes: resNotes.trim() || null,
          startDatetime: `${resDate}T${resStart}:00-03:00`,
          endDatetime: `${resDate}T${resEnd}:00-03:00`,
        }),
      });
      setReserveOpen(false);
      setResTitle("");
      setResNotes("");
      setNotice("Sala reservada com sucesso.");
      reload();
    } catch (cause) {
      setResError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível criar a reserva.",
      );
    } finally {
      setResSubmitting(false);
    }
  }

  async function handleCreateRoom(event: React.FormEvent) {
    event.preventDefault();
    if (roomSaving) return;
    if (roomName.trim().length < 2) {
      setRoomError("Informe um nome para a sala.");
      return;
    }
    setRoomSaving(true);
    setRoomError(null);
    try {
      await apiFetch("/rooms", {
        method: "POST",
        body: JSON.stringify({
          name: roomName.trim(),
          location: roomLocation.trim() || null,
          capacity: Number(roomCapacity) || 2,
          notes: roomNotes.trim() || null,
        }),
      });
      setRoomName("");
      setRoomLocation("");
      setRoomCapacity("2");
      setRoomNotes("");
      setNotice("Sala cadastrada.");
      reload();
    } catch (cause) {
      setRoomError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível cadastrar a sala.",
      );
    } finally {
      setRoomSaving(false);
    }
  }

  async function handleToggleRoom(room: ClinicRoom) {
    setRoomSaving(true);
    setRoomError(null);
    try {
      await apiFetch(`/rooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      reload();
    } catch (cause) {
      setRoomError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível atualizar a sala.",
      );
    } finally {
      setRoomSaving(false);
    }
  }

  async function handleCancelReservation(reservation: RoomReservation) {
    setCancelling(true);
    setError(null);
    try {
      await apiFetch(`/rooms/reservations/${reservation.id}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });
      setCancelReason("");
      setSelectedId(null);
      setNotice("Reserva cancelada.");
      reload();
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível cancelar a reserva.",
      );
    } finally {
      setCancelling(false);
    }
  }

  const activeRooms = rooms.filter((r) => r.isActive);
  const events: CalendarEvent[] = reservations.map((item) => ({
    id: item.id,
    start: item.startDatetime,
    end: item.endDatetime,
    title: `${item.room.name} · ${item.title}`,
    subtitle: item.reservedBy.name,
    status: item.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
    doctorId: item.roomId,
  }));
  const selected = reservations.find((r) => r.id === selectedId);
  const canCancelSelected =
    selected &&
    selected.status === "CONFIRMED" &&
    (isAdmin ||
      role === "RECEPTIONIST" ||
      selected.reservedById === currentUserId);

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <DoorOpen className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Reserva de salas e consultórios
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visualize a ocupação dos consultórios por semana ou dia e evite
              conflitos de horário.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setRoomError(null);
                setManageOpen(true);
              }}
            >
              <Settings2 className="size-4" />
              Gerenciar salas ({rooms.length})
            </Button>
          )}
          <Button
            type="button"
            className="min-h-11"
            disabled={activeRooms.length === 0}
            onClick={() => {
              setResError(null);
              setResRoomId(roomFilter || activeRooms[0]?.id || "");
              setReserveOpen(true);
            }}
          >
            <CalendarPlus className="size-4" />
            Reservar sala
          </Button>
        </div>
      </header>

      {notice && <Alert kind="success">{notice}</Alert>}
      {error && <Alert kind="error">{error}</Alert>}

      {activeRooms.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          Nenhuma sala cadastrada ainda.{" "}
          {isAdmin
            ? "Use o botão Gerenciar salas acima para cadastrar os consultórios da clínica."
            : "Peça à administração para cadastrar os consultórios disponíveis."}
        </div>
      )}

      <AppointmentCalendar
        events={events}
        loading={loading}
        error={error}
        title="Ocupação de salas"
        onRangeChange={changeRange}
        doctors={rooms.map((room) => ({ id: room.id, name: room.name }))}
        selectedDoctorId={roomFilter}
        onDoctorChange={(id) => {
          if (id === roomFilter) return;
          setLoading(true);
          setSelectedId(null);
          setRoomFilter(id);
        }}
        onSelectEvent={(event) => setSelectedId(event.id)}
      />

      {error && (
        <Button type="button" variant="outline" onClick={reload}>
          <RotateCw className="size-4" />
          Tentar novamente
        </Button>
      )}

      {selected && (
        <section
          aria-labelledby="selected-reservation-title"
          className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="selected-reservation-title"
              className="text-lg font-semibold text-foreground"
            >
              {selected.room.name} — {selected.title}
            </h2>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
              {roomReservationStatusLabels[selected.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Reservado por{" "}
            <strong className="text-foreground">
              {selected.reservedBy.name}
            </strong>{" "}
            ·{" "}
            {calendarDateKey(selected.startDatetime)
              .split("-")
              .reverse()
              .join("/")}{" "}
            · {calendarTimeLabel(selected.startDatetime)} às{" "}
            {calendarTimeLabel(selected.endDatetime)}
            {selected.room.location ? ` · ${selected.room.location}` : ""}
          </p>
          {selected.notes && (
            <p className="text-sm text-foreground">{selected.notes}</p>
          )}
          {selected.cancelReason && (
            <p className="text-sm text-destructive">
              Motivo do cancelamento: {selected.cancelReason}
            </p>
          )}
          {canCancelSelected && (
            <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
              <div className="min-w-60 flex-1">
                <FormField
                  id="cancel-room-reason"
                  label="Motivo do cancelamento (opcional)"
                >
                  <input
                    id="cancel-room-reason"
                    className={inputClassName}
                    maxLength={300}
                    value={cancelReason}
                    disabled={cancelling}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                </FormField>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={cancelling}
                onClick={() => void handleCancelReservation(selected)}
              >
                {cancelling && <Loader2 className="size-4 animate-spin" />}
                Cancelar reserva
              </Button>
            </div>
          )}
        </section>
      )}

      {reserveOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reserve-room-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 id="reserve-room-heading" className="text-lg font-semibold">
                  Reservar sala ou consultório
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Horários no fuso de Brasília. Conflitos simultâneos são
                  bloqueados automaticamente.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={() => setReserveOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <form
              onSubmit={(event) => void handleReserve(event)}
              className="mt-5 space-y-4"
            >
              <FormField id="reserve-room-id" label="Sala / Consultório *">
                <select
                  id="reserve-room-id"
                  className={inputClassName}
                  value={resRoomId}
                  disabled={resSubmitting}
                  onChange={(e) => setResRoomId(e.target.value)}
                  required
                >
                  <option value="">Selecione a sala</option>
                  {activeRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {r.location ? ` (${r.location})` : ""}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="reserve-title" label="Finalidade / Título *">
                <input
                  id="reserve-title"
                  className={inputClassName}
                  maxLength={140}
                  value={resTitle}
                  disabled={resSubmitting}
                  placeholder="Ex.: Atendimento presencial, supervisão ou reunião"
                  onChange={(e) => setResTitle(e.target.value)}
                  required
                />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField id="reserve-date" label="Data *">
                  <input
                    id="reserve-date"
                    type="date"
                    className={inputClassName}
                    value={resDate}
                    disabled={resSubmitting}
                    onChange={(e) => setResDate(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="reserve-start" label="Início *">
                  <input
                    id="reserve-start"
                    type="time"
                    className={inputClassName}
                    value={resStart}
                    disabled={resSubmitting}
                    onChange={(e) => setResStart(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="reserve-end" label="Término *">
                  <input
                    id="reserve-end"
                    type="time"
                    className={inputClassName}
                    value={resEnd}
                    disabled={resSubmitting}
                    onChange={(e) => setResEnd(e.target.value)}
                    required
                  />
                </FormField>
              </div>
              <FormField id="reserve-notes" label="Observações (opcional)">
                <textarea
                  id="reserve-notes"
                  className={textareaClassName}
                  maxLength={500}
                  value={resNotes}
                  disabled={resSubmitting}
                  onChange={(e) => setResNotes(e.target.value)}
                />
              </FormField>
              {resError && <Alert kind="error">{resError}</Alert>}
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={resSubmitting}
                  onClick={() => setReserveOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={resSubmitting}>
                  {resSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Confirmar reserva
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageOpen && isAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="manage-rooms-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 id="manage-rooms-heading" className="text-lg font-semibold">
                  Gerenciar salas e consultórios
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre ou desative espaços físicos disponíveis para reserva.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={() => setManageOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(event) => void handleCreateRoom(event)}
              className="mt-5 space-y-4 border-b border-border pb-5"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField id="new-room-name" label="Nome da sala *">
                  <input
                    id="new-room-name"
                    className={inputClassName}
                    maxLength={80}
                    value={roomName}
                    disabled={roomSaving}
                    placeholder="Ex.: Consultório 01"
                    onChange={(e) => setRoomName(e.target.value)}
                    required
                  />
                </FormField>
                <FormField id="new-room-location" label="Localização">
                  <input
                    id="new-room-location"
                    className={inputClassName}
                    maxLength={120}
                    value={roomLocation}
                    disabled={roomSaving}
                    placeholder="Ex.: 1º andar · Ala A"
                    onChange={(e) => setRoomLocation(e.target.value)}
                  />
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField id="new-room-capacity" label="Capacidade">
                  <input
                    id="new-room-capacity"
                    type="number"
                    min={1}
                    max={100}
                    className={inputClassName}
                    value={roomCapacity}
                    disabled={roomSaving}
                    onChange={(e) => setRoomCapacity(e.target.value)}
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField id="new-room-notes" label="Recursos / Observações">
                    <input
                      id="new-room-notes"
                      className={inputClassName}
                      maxLength={500}
                      value={roomNotes}
                      disabled={roomSaving}
                      placeholder="Ex.: Atendimento infantil, lousa, brinquedoteca"
                      onChange={(e) => setRoomNotes(e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
              {roomError && <Alert kind="error">{roomError}</Alert>}
              <Button type="submit" disabled={roomSaving}>
                {roomSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Cadastrar sala
              </Button>
            </form>

            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold">Salas cadastradas</h3>
              {rooms.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma sala cadastrada.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rooms.map((room) => (
                    <li
                      key={room.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {room.name}{" "}
                          <span className="text-xs text-muted-foreground">
                            · {room.capacity} lugares
                          </span>
                        </p>
                        {room.location && (
                          <p className="text-xs text-muted-foreground">
                            {room.location}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={roomSaving}
                        onClick={() => void handleToggleRoom(room)}
                      >
                        {room.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
