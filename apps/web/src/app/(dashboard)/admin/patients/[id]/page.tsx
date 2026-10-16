"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api-client";
import { maskCpf, maskPhone } from "@/lib/br-format";
import { formatDatePtBr } from "@/lib/date-format";
type Patient = {
  user: {
    name: string;
    email: string;
    cpf: string;
    birthDate: string | null;
    isActive: boolean;
  };
  phones: { phone: string }[];
  insuranceProvider: string | null;
  insuranceNumber: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};
export default function AdministrativePatientPage() {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<{
    id: string;
    patient?: Patient;
    error?: string;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<Patient>(`/patients/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    })
      .then((patient) => {
        if (!controller.signal.aborted) setResult({ id, patient });
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            id,
            error:
              err instanceof ApiError
                ? err.message
                : "Não foi possível carregar o cadastro.",
          });
      });
    return () => controller.abort();
  }, [id]);
  const patient = result?.id === id ? result.patient : undefined;
  const error = result?.id === id ? result.error : undefined;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/users"
        className="text-sm text-primary hover:underline"
      >
        Voltar para usuários
      </Link>
      <h1 className="text-2xl font-semibold">Dados do paciente</h1>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : !patient ? (
        <p role="status">Carregando cadastro...</p>
      ) : (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 text-lg font-semibold">{patient.user.name}</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              ["E-mail", patient.user.email],
              ["CPF", maskCpf(patient.user.cpf)],
              [
                "Nascimento",
                patient.user.birthDate
                  ? formatDatePtBr(patient.user.birthDate)
                  : "Não informado",
              ],
              [
                "Telefone",
                patient.phones[0]
                  ? maskPhone(patient.phones[0].phone)
                  : "Não informado",
              ],
              ["Plano", patient.insuranceProvider ?? "Não informado"],
              ["Número do plano", patient.insuranceNumber ?? "Não informado"],
              [
                "Responsável / contato de emergência",
                patient.emergencyContactName ?? "Não informado",
              ],
              [
                "Telefone do contato",
                patient.emergencyContactPhone
                  ? maskPhone(patient.emergencyContactPhone)
                  : "Não informado",
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
