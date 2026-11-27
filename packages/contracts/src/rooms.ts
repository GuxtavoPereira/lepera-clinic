export const roomReservationStatuses = ["CONFIRMED", "CANCELLED"] as const;
export type RoomReservationStatus = (typeof roomReservationStatuses)[number];

export const roomReservationStatusLabels: Record<
  RoomReservationStatus,
  string
> = {
  CONFIRMED: "Confirmada",
  CANCELLED: "Cancelada",
};
