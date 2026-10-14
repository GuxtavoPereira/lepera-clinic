"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Pencil, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/forms/form-field";
import {
  buildPatientPayload,
  EMPTY_PATIENT_FORM,
  PatientFields,
  patientToForm,
  validatePatientForm,
  type PatientFormState,
} from "@/components/patients/patient-fields";
import { ApiError, apiFetch } from "@/lib/api-client";
import { maskCpf, maskPhone } from "@/lib/br-format";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";

type PatientDetail = {
  id: string;
  status: string;
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  user: {
    name: string;
    email: string;
    cpf: string | null;
    birthDate: string | null;
    isActive: boolean;
  };
  phones: { id: string; phone: string }[];
  addresses: {
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  }[];
  responsibleDoctor: { user: { name: string } } | null;
  appointments: {
    id: string;
    startDatetime: string;
    status: string;
    type: string;
    doctor: { user: { name: string } };
  }[];
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendada",
  CONFIRMED: "Confirmada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  RESCHEDULED: "Remarcada",
  WAITING: "Aguardando atendimento",
};

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default function PatientDetailsPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [initial, setInitial] = useState<PatientFormState>(EMPTY_PATIENT_FORM);
  const [form, setForm] = useState<PatientFormState>(EMPTY_PATIENT_FORM);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function apply(detail: PatientDetail) {
    const next = patientToForm({ user: detail.user, patient: detail });
    setPatient(detail);
    setInitial(next);
    setForm(next);
  }

  useEffect(() => {
    let active = true;
    void apiFetch<PatientDetail>(`/patients/${patientId}`)
      .then((detail) => {
        if (active) apply(detail);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o paciente.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [patientId]);

  async function handleSave() {
    const problem = validatePatientForm(form, { cpfRequired: true });
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<PatientDetail>(`/patients/${patientId}`, {
        method: "PATCH",
        // A recepção pode corrigir o CPF (locked = false).
        body: JSON.stringify(buildPatientPayload(form, initial, { cpfLocked: false })),
      });
      apply(updated);
      setEditing(false);
      setNotice("Cadastro atualizado.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando paciente...</p>;
  }

  if (!patient) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/reception/patients"
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar para pacientes
        </Link>
        <Alert kind="error">{error ?? "Paciente não encontrado."}</Alert>
      </div>
    );
  }

  const address = patient.addresses[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/reception/patients"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar para pacientes
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {patient.user.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{patient.user.email}</p>
          </div>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNotice(null);
                setError(null);
                setEditing(true);
              }}
            >
              <Pencil className="size-4" />
              Editar cadastro
            </Button>
          )}
        </div>
      </div>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {editing ? (
        <form
          onSubmit={(event) => event.preventDefault()}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <PatientFields
            value={form}
            onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
            email={patient.user.email}
            idPrefix="edit"
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(initial);
                setError(null);
                setEditing(false);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <dl className="grid gap-5 sm:grid-cols-2">
              <Info
                label="CPF"
                value={patient.user.cpf ? maskCpf(patient.user.cpf) : null}
              />
              <Info
                label="Nascimento"
                value={
                  patient.user.birthDate
                    ? formatDatePtBr(patient.user.birthDate)
                    : null
                }
              />
              <Info
                label="Telefone"
                value={patient.phones[0] ? maskPhone(patient.phones[0].phone) : null}
              />
              <Info
                label="Profissional responsável"
                value={patient.responsibleDoctor?.user.name ?? null}
              />
              <div className="sm:col-span-2">
                <Info
                  label="Endereço"
                  value={
                    address
                      ? `${address.street}, ${address.number}${
                          address.complement ? ` — ${address.complement}` : ""
                        } · ${address.neighborhood}, ${address.city}/${address.state} · CEP ${address.zipCode}`
                      : null
                  }
                />
              </div>
              <Info
                label="Plano de saúde"
                value={
                  patient.insuranceProvider
                    ? `${patient.insuranceProvider}${
                        patient.insuranceNumber ? ` · ${patient.insuranceNumber}` : ""
                      }`
                    : null
                }
              />
              <Info
                label="Contato de emergência / responsável"
                value={
                  patient.emergencyContactName
                    ? `${patient.emergencyContactName}${
                        patient.emergencyContactPhone
                          ? ` · ${maskPhone(patient.emergencyContactPhone)}`
                          : ""
                      }`
                    : null
                }
              />
              <div className="sm:col-span-2">
                <Info label="ID do paciente" value={patient.id} />
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Últimas consultas
            </h2>
            {patient.appointments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                Nenhuma consulta registrada.
              </p>
            ) : (
              <ul className="space-y-2">
                {patient.appointments.map((appointment) => (
                  <li
                    key={appointment.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  >
                    <span className="text-slate-700">
                      {formatDateTimePtBr(appointment.startDatetime)} · com{" "}
                      {appointment.doctor.user.name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                      {STATUS_LABELS[appointment.status] ?? appointment.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
