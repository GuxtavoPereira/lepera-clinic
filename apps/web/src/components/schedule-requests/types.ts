export type DoctorOption = {
  id: string;
  specialty: string;
  user: { name: string };
};

export type ScheduleRequest = {
  id: string;
  mode: "EXACT" | "FLEXIBLE";
  type: string;
  preferredDoctorId: string | null;
  requestedStartDatetime: string | null;
  durationMinutes: number;
  modality: "IN_PERSON" | "ONLINE";
  preferredDate: string | null;
  preferredShift: string | null;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  patient: { user: { name: string; email: string } };
  preferredDoctor: { user: { name: string } } | null;
  generatedAppointment: { startDatetime: string; endDatetime: string; status: string } | null;
};

export const requestStatusLabels = {
  PENDING: "Aguardando confirmação",
  APPROVED: "Aprovada",
  REJECTED: "Não aprovada",
};

export function validRequestDate(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : "";
}
