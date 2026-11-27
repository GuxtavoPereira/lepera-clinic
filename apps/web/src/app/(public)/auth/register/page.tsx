"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, ShieldCheck, User, Users } from "lucide-react";
import {
  guardianRelationshipSuggestions,
  isValidCpf,
} from "@lepera/contracts";
import { onlyDigits } from "@/lib/br-format";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName } from "@/components/forms/form-field";
import {
  RegistrationFields,
  RegistrationProgress,
  registrationPayload,
} from "@/components/forms/registration-fields";
import { useRegistrationWizard } from "@/components/forms/use-registration-wizard";
import { SocialNameFields } from "@/components/profile/social-name-fields";
import { ApiError } from "@/lib/api-client";
import { registerGuardian, registerPatient } from "@/lib/auth";
import type { RegistrationStep } from "@/lib/registration-validation";
import { clearPreview, requestedSlotPath } from "@/lib/google-preview";

type RegisterMode = "SELF" | "GUARDIAN";

type GuardianFormState = {
  name: string;
  socialName: string;
  useSocialName: boolean;
  cpf: string;
  birthDate: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  dependentName: string;
  dependentSocialName: string;
  dependentUseSocialName: boolean;
  dependentCpf: string;
  dependentBirthDate: string;
  relationship: string;
  insuranceProvider: string;
  insuranceNumber: string;
};

const EMPTY_GUARDIAN: GuardianFormState = {
  name: "",
  socialName: "",
  useSocialName: false,
  cpf: "",
  birthDate: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  dependentName: "",
  dependentSocialName: "",
  dependentUseSocialName: false,
  dependentCpf: "",
  dependentBirthDate: "",
  relationship: "Mãe",
  insuranceProvider: "",
  insuranceNumber: "",
};

function computeAge(dateStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<RegisterMode>("SELF");
  const wizard = useRegistrationWizard("register");
  const [submitting, setSubmitting] = useState(false);

  const [guardian, setGuardian] = useState<GuardianFormState>(EMPTY_GUARDIAN);
  const [guardianErrors, setGuardianErrors] = useState<Record<string, string>>({});
  const [guardianGeneralError, setGuardianGeneralError] = useState<string | null>(null);

  function updateGuardian(patch: Partial<GuardianFormState>) {
    setGuardian((prev) => ({ ...prev, ...patch }));
    const keys = Object.keys(patch);
    if (keys.length > 0) {
      setGuardianErrors((prev) => {
        const next = { ...prev };
        for (const k of keys) delete next[k];
        return next;
      });
    }
    setGuardianGeneralError(null);
  }

  async function submitSelf(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (wizard.step < 3) {
      if (wizard.validate(wizard.step))
        wizard.goToStep((wizard.step + 1) as RegistrationStep);
      return;
    }
    if (!wizard.validate()) return;
    setSubmitting(true);
    try {
      await registerPatient(registrationPayload(wizard.form));
      const next = requestedSlotPath();
      clearPreview();
      router.push(next);
    } catch (err) {
      wizard.handleApiError(
        err,
        "Não foi possível confirmar o cadastro. Tente entrar com seu e-mail e senha antes de enviar novamente. Seus dados foram mantidos nesta tela.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function validateGuardian(): boolean {
    const errors: Record<string, string> = {};
    const gCpf = onlyDigits(guardian.cpf);
    const dCpf = onlyDigits(guardian.dependentCpf);
    const phoneDigits = onlyDigits(guardian.phone);
    const gAge = computeAge(guardian.birthDate);
    const dAge = computeAge(guardian.dependentBirthDate);

    if (guardian.name.trim().length < 2) {
      errors.name = "Informe o nome civil completo do responsável.";
    }
    if (guardian.useSocialName && guardian.socialName.trim().length < 2) {
      errors.socialName = "Informe o nome social (mínimo 2 caracteres).";
    }
    if (!isValidCpf(gCpf)) {
      errors.cpf = "Informe um CPF válido para o responsável.";
    }
    if (gAge === null || gAge < 18) {
      errors.birthDate = "O responsável deve ter pelo menos 18 anos completos.";
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      errors.phone = "Informe um telefone com DDD (10 ou 11 dígitos).";
    }
    if (!/^\S+@\S+\.\S+$/.test(guardian.email.trim())) {
      errors.email = "Informe um e-mail válido.";
    }
    if (guardian.password.length < 8) {
      errors.password = "A senha deve ter pelo menos 8 caracteres.";
    }
    if (guardian.confirmPassword !== guardian.password) {
      errors.confirmPassword = "As senhas não conferem.";
    }

    if (guardian.dependentName.trim().length < 2) {
      errors.dependentName = "Informe o nome civil completo do dependente.";
    }
    if (
      guardian.dependentUseSocialName &&
      guardian.dependentSocialName.trim().length < 2
    ) {
      errors.dependentSocialName = "Informe o nome social do dependente.";
    }
    if (!isValidCpf(dCpf)) {
      errors.dependentCpf = "Informe um CPF válido para o dependente.";
    } else if (gCpf === dCpf) {
      errors.dependentCpf =
        "O CPF do dependente não pode ser igual ao CPF do responsável.";
    }
    if (dAge === null || dAge < 0 || dAge >= 18) {
      errors.dependentBirthDate =
        "O dependente deve ser menor de 18 anos. Maiores de idade usam o cadastro próprio.";
    }
    if (guardian.relationship.trim().length < 2) {
      errors.relationship = "Informe o parentesco ou vínculo com o menor.";
    }

    setGuardianErrors(errors);
    const firstKey = Object.keys(errors)[0];
    if (firstKey) {
      document.getElementById(`guardian-${firstKey}`)?.focus();
      return false;
    }
    return true;
  }

  async function submitGuardian(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!validateGuardian()) return;

    setSubmitting(true);
    setGuardianGeneralError(null);
    try {
      await registerGuardian({
        name: guardian.name.trim(),
        socialName: guardian.socialName.trim() || null,
        useSocialName: guardian.useSocialName,
        email: guardian.email.trim().toLowerCase(),
        password: guardian.password,
        cpf: onlyDigits(guardian.cpf),
        birthDate: guardian.birthDate,
        phone: onlyDigits(guardian.phone),
        dependent: {
          name: guardian.dependentName.trim(),
          socialName: guardian.dependentSocialName.trim() || null,
          useSocialName: guardian.dependentUseSocialName,
          cpf: onlyDigits(guardian.dependentCpf),
          birthDate: guardian.dependentBirthDate,
          relationship: guardian.relationship.trim(),
          ...(guardian.insuranceProvider.trim()
            ? { insuranceProvider: guardian.insuranceProvider.trim() }
            : {}),
          ...(guardian.insuranceNumber.trim()
            ? { insuranceNumber: guardian.insuranceNumber.trim() }
            : {}),
        },
      });
      clearPreview();
      router.push("/guardian/dashboard");
    } catch (err) {
      setGuardianGeneralError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir o cadastro do responsável. Verifique os dados e tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">Criar conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Escolha se o cadastro é para você mesmo ou como responsável por um menor.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Tipo de cadastro"
        className="mb-6 grid gap-3 sm:grid-cols-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "SELF"}
          onClick={() => setMode("SELF")}
          className={`flex min-h-14 items-center gap-3 rounded-2xl border p-4 text-left transition ${
            mode === "SELF"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border bg-card hover:bg-accent/50"
          }`}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <User className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Para mim</p>
            <p className="text-xs text-muted-foreground">
              Paciente com acesso próprio
            </p>
          </div>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mode === "GUARDIAN"}
          onClick={() => setMode("GUARDIAN")}
          className={`flex min-h-14 items-center gap-3 rounded-2xl border p-4 text-left transition ${
            mode === "GUARDIAN"
              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
              : "border-border bg-card hover:bg-accent/50"
          }`}
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Users className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Para outra pessoa
            </p>
            <p className="text-xs text-muted-foreground">
              Sou responsável por um menor
            </p>
          </div>
        </button>
      </div>

      {mode === "SELF" ? (
        <form
          onSubmit={submitSelf}
          noValidate
          className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <RegistrationProgress step={wizard.step} />
          <RegistrationFields
            value={wizard.form}
            onChange={wizard.update}
            prefix="register"
            step={wizard.step}
            errors={wizard.errors}
            internal={false}
          />
          {wizard.generalError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            >
              {wizard.generalError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
            {wizard.step > 1 ? (
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() =>
                  wizard.goToStep((wizard.step - 1) as RegistrationStep)
                }
                disabled={submitting}
              >
                <ArrowLeft className="size-4" />
                Voltar
              </Button>
            ) : (
              <Link
                href="/auth/login?next=/patient/request-appointment"
                className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition hover:text-foreground"
              >
                Já tenho conta
              </Link>
            )}
            <Button type="submit" className="min-h-11" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {wizard.step < 3 ? (
                <>
                  Continuar
                  <ArrowRight className="size-4" />
                </>
              ) : (
                "Concluir cadastro"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={submitGuardian}
          noValidate
          className="space-y-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
        >
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <p>
              Você terá sua conta própria de <strong>Responsável</strong> para
              agendar consultas e acessar as devolutivas liberadas. O dependente
              menor fica vinculado com CPF próprio, <strong>sem login</strong> e
              com privacidade preservada.
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="border-b border-border pb-2 text-base font-semibold text-foreground">
              1. Dados do responsável (maior de 18 anos)
            </h2>
            <FormField
              id="guardian-name"
              label="Nome civil completo do responsável"
              error={guardianErrors.name}
            >
              <input
                id="guardian-name"
                required
                className={inputClassName}
                value={guardian.name}
                onChange={(e) => updateGuardian({ name: e.target.value })}
              />
            </FormField>
            <SocialNameFields
              value={{
                socialName: guardian.socialName,
                useSocialName: guardian.useSocialName,
              }}
              onChange={(patch) => updateGuardian(patch)}
              idPrefix="guardian"
              error={guardianErrors.socialName}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="guardian-cpf"
                label="CPF do responsável"
                error={guardianErrors.cpf}
              >
                <input
                  id="guardian-cpf"
                  inputMode="numeric"
                  placeholder="Somente números"
                  className={inputClassName}
                  value={guardian.cpf}
                  onChange={(e) => updateGuardian({ cpf: e.target.value })}
                />
              </FormField>
              <FormField
                id="guardian-birthDate"
                label="Data de nascimento"
                error={guardianErrors.birthDate}
              >
                <input
                  id="guardian-birthDate"
                  type="date"
                  className={inputClassName}
                  value={guardian.birthDate}
                  onChange={(e) =>
                    updateGuardian({ birthDate: e.target.value })
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="guardian-phone"
                label="Telefone / WhatsApp com DDD"
                error={guardianErrors.phone}
              >
                <input
                  id="guardian-phone"
                  inputMode="tel"
                  placeholder="(12) 99999-8888"
                  className={inputClassName}
                  value={guardian.phone}
                  onChange={(e) => updateGuardian({ phone: e.target.value })}
                />
              </FormField>
              <FormField
                id="guardian-email"
                label="E-mail de acesso"
                error={guardianErrors.email}
              >
                <input
                  id="guardian-email"
                  type="email"
                  className={inputClassName}
                  value={guardian.email}
                  onChange={(e) => updateGuardian({ email: e.target.value })}
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="guardian-password"
                label="Senha (mínimo 8 caracteres)"
                error={guardianErrors.password}
              >
                <input
                  id="guardian-password"
                  type="password"
                  className={inputClassName}
                  value={guardian.password}
                  onChange={(e) => updateGuardian({ password: e.target.value })}
                />
              </FormField>
              <FormField
                id="guardian-confirmPassword"
                label="Confirmar senha"
                error={guardianErrors.confirmPassword}
              >
                <input
                  id="guardian-confirmPassword"
                  type="password"
                  className={inputClassName}
                  value={guardian.confirmPassword}
                  onChange={(e) =>
                    updateGuardian({ confirmPassword: e.target.value })
                  }
                />
              </FormField>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="border-b border-border pb-2 text-base font-semibold text-foreground">
              2. Dados do dependente (menor de 18 anos)
            </h2>
            <FormField
              id="guardian-dependentName"
              label="Nome civil completo do dependente"
              error={guardianErrors.dependentName}
            >
              <input
                id="guardian-dependentName"
                required
                className={inputClassName}
                value={guardian.dependentName}
                onChange={(e) =>
                  updateGuardian({ dependentName: e.target.value })
                }
              />
            </FormField>
            <SocialNameFields
              value={{
                socialName: guardian.dependentSocialName,
                useSocialName: guardian.dependentUseSocialName,
              }}
              onChange={(patch) =>
                updateGuardian({
                  ...(patch.socialName !== undefined
                    ? { dependentSocialName: patch.socialName }
                    : {}),
                  ...(patch.useSocialName !== undefined
                    ? { dependentUseSocialName: patch.useSocialName }
                    : {}),
                })
              }
              idPrefix="guardian-dependent"
              error={guardianErrors.dependentSocialName}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="guardian-dependentCpf"
                label="CPF próprio do dependente"
                error={guardianErrors.dependentCpf}
              >
                <input
                  id="guardian-dependentCpf"
                  inputMode="numeric"
                  placeholder="Somente números"
                  className={inputClassName}
                  value={guardian.dependentCpf}
                  onChange={(e) =>
                    updateGuardian({ dependentCpf: e.target.value })
                  }
                />
              </FormField>
              <FormField
                id="guardian-dependentBirthDate"
                label="Data de nascimento do menor"
                error={guardianErrors.dependentBirthDate}
              >
                <input
                  id="guardian-dependentBirthDate"
                  type="date"
                  className={inputClassName}
                  value={guardian.dependentBirthDate}
                  onChange={(e) =>
                    updateGuardian({ dependentBirthDate: e.target.value })
                  }
                />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                id="guardian-relationship"
                label="Parentesco / vínculo"
                error={guardianErrors.relationship}
              >
                <input
                  id="guardian-relationship"
                  list="guardian-relationship-options"
                  className={inputClassName}
                  value={guardian.relationship}
                  onChange={(e) =>
                    updateGuardian({ relationship: e.target.value })
                  }
                />
                <datalist id="guardian-relationship-options">
                  {guardianRelationshipSuggestions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              </FormField>
              <FormField
                id="guardian-insuranceProvider"
                label="Convênio (opcional)"
              >
                <input
                  id="guardian-insuranceProvider"
                  className={inputClassName}
                  value={guardian.insuranceProvider}
                  onChange={(e) =>
                    updateGuardian({ insuranceProvider: e.target.value })
                  }
                />
              </FormField>
              <FormField
                id="guardian-insuranceNumber"
                label="Carteirinha (opcional)"
              >
                <input
                  id="guardian-insuranceNumber"
                  className={inputClassName}
                  value={guardian.insuranceNumber}
                  onChange={(e) =>
                    updateGuardian({ insuranceNumber: e.target.value })
                  }
                />
              </FormField>
            </div>
          </section>

          {guardianGeneralError && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
            >
              {guardianGeneralError}
            </p>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition hover:text-foreground"
            >
              Já tenho conta
            </Link>
            <Button type="submit" className="min-h-11" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Criar conta de responsável
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
