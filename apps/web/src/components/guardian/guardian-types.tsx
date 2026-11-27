"use client";

export type PortalPatient = {
  patientId: string;
  linkId: string | null;
  isSelf: boolean;
  relationship: string;
  name: string;
  civilName: string | null;
  cpf: string;
  birthDate: string | null;
  age: number | null;
  insuranceProvider: string | null;
};

export type PortalAppointment = {
  id: string;
  doctorId: string;
  startDatetime: string;
  endDatetime: string;
  durationMinutes: number;
  modality: "IN_PERSON" | "ONLINE";
  type: string;
  status: string;
  cancelReason: string | null;
  roomOrLink: string | null;
  doctor: {
    specialty: string;
    user: { name: string };
  };
};

export type PortalScheduleRequest = {
  id: string;
  mode: "EXACT" | "FLEXIBLE";
  status: "PENDING" | "APPROVED" | "REJECTED";
  modality: "IN_PERSON" | "ONLINE";
  requestedStartDatetime: string | null;
  preferredDate: string | null;
  preferredShift: string | null;
  reason: string | null;
  createdAt: string;
  preferredDoctor: { user: { name: string } } | null;
  generatedAppointment: {
    id: string;
    startDatetime: string;
    status: string;
  } | null;
};

export type PortalFeedbackSummary = {
  id: string;
  title: string;
  documentNumber: string | null;
  version: number;
  signedAt: string | null;
  releasedAt: string | null;
  updatedAt: string;
  doctor: {
    licenseNumber: string;
    specialty: string;
    user: { name: string };
  };
};

export type PortalFeedbackDetail = {
  id: string;
  title: string;
  documentNumber: string | null;
  version: number;
  signedAt: string | null;
  releasedAt: string | null;
  patient: { id: string; name: string };
  doctor: {
    name: string;
    licenseNumber: string;
    specialty: string;
  };
  sections: Array<{ key: string; label: string; value: string }>;
};

export function DependentSelector({
  patients,
  selectedId,
  onSelect,
}: {
  patients: PortalPatient[];
  selectedId: string;
  onSelect: (patientId: string) => void;
}) {
  if (patients.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <label
        htmlFor="guardian-patient-selector"
        className="text-sm font-semibold text-foreground"
      >
        Atendimento para:
      </label>
      <select
        id="guardian-patient-selector"
        className="min-h-10 min-w-56 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring sm:max-w-md"
        value={selectedId}
        onChange={(e) => onSelect(e.target.value)}
      >
        {patients.map((p) => (
          <option key={p.patientId} value={p.patientId}>
            {p.name} — {p.relationship}
            {p.age !== null ? ` (${p.age} anos)` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
