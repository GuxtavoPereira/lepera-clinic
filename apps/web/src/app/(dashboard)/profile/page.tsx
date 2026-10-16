"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { maskCpf } from "@/lib/br-format";
import { formatDatePtBr } from "@/lib/date-format";
type Profile = {
  name: string;
  email: string;
  cpf: string;
  birthDate: string | null;
  role: string;
  isActive: boolean;
};
const labels: Record<string, string> = {
  ADMIN: "Administração",
  SUPER_ADMIN: "Superadministrador",
  DOCTOR: "Profissional",
  PATIENT: "Paciente",
  RECEPTIONIST: "Recepção",
};
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<Profile>("/profile/me", { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setProfile(data);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar seu perfil.",
          );
      });
    return () => controller.abort();
  }, []);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="flex items-center gap-3 text-2xl font-semibold text-foreground">
        <UserRound className="size-6 text-primary" />
        Meu perfil
      </h1>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 p-4 text-destructive"
        >
          {error}
        </p>
      ) : !profile ? (
        <p role="status" className="text-muted-foreground">
          Carregando perfil...
        </p>
      ) : (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-5 font-semibold">Dados da minha conta</h2>
          <dl className="grid gap-5 sm:grid-cols-2">
            {[
              ["Nome", profile.name],
              ["E-mail", profile.email],
              ["CPF", maskCpf(profile.cpf)],
              [
                "Nascimento",
                profile.birthDate
                  ? formatDatePtBr(profile.birthDate)
                  : "Não informado",
              ],
              ["Perfil", labels[profile.role] ?? profile.role],
              ["Situação", profile.isActive ? "Ativo" : "Inativo"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-sm text-muted-foreground">
            Correções cadastrais podem ser feitas na gestão de usuários.
          </p>
        </section>
      )}
      <Link
        href="/settings/security"
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Segurança e alteração de senha
      </Link>
    </div>
  );
}
