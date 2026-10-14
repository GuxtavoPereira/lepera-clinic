"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  FormField,
  inputClassName,
} from "@/components/forms/form-field";
import { ApiError } from "@/lib/api-client";
import { registerPatient } from "@/lib/auth";
import {
  isUnder18,
  isValidBirthDate,
  isValidCpf,
  isValidPhone,
  maskCpf,
  maskPhone,
  onlyDigits,
} from "@/lib/br-format";

type Form = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  cpf: string;
  birthDate: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  insuranceProvider: string;
  insuranceNumber: string;
  consent: boolean;
};

const INITIAL: Form = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  cpf: "",
  birthDate: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  insuranceProvider: "",
  insuranceNumber: "",
  consent: false,
};

const STEPS = ["Acesso", "Dados pessoais", "Responsável e plano"];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(INITIAL);
  const [minor, setMinor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(patch: Partial<Form>) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
  }

  function validate(target: number): string | null {
    if (target === 1) {
      if (form.name.trim().length < 2) return "Informe seu nome completo.";
      if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "E-mail inválido.";
      if (form.password.length < 8) {
        return "A senha precisa de pelo menos 8 caracteres.";
      }
      if (form.password !== form.confirmPassword) {
        return "As senhas não conferem.";
      }
    }
    if (target === 2) {
      if (!isValidCpf(form.cpf)) return "CPF inválido.";
      if (!isValidBirthDate(form.birthDate)) {
        return "Informe uma data de nascimento válida.";
      }
      if (!isValidPhone(form.phone)) return "Telefone inválido (DDD + número).";
    }
    if (target === 3) {
      if (minor) {
        if (form.emergencyContactName.trim().length < 2) {
          return "Menores de 18 anos precisam informar o nome do responsável legal.";
        }
        if (!isValidPhone(form.emergencyContactPhone)) {
          return "Informe o telefone do responsável legal.";
        }
      } else if (
        form.emergencyContactPhone &&
        !isValidPhone(form.emergencyContactPhone)
      ) {
        return "Telefone do contato de emergência inválido.";
      }
      if (!form.consent) {
        return "É preciso aceitar o uso dos dados para concluir o cadastro.";
      }
    }
    return null;
  }

  function next() {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((current) => current + 1);
  }

  async function submit() {
    const problem = validate(3);
    if (problem) {
      setError(problem);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const text = (value: string) => value.trim() || undefined;
      await registerPatient({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        cpf: onlyDigits(form.cpf),
        birthDate: form.birthDate,
        phone: onlyDigits(form.phone),
        insuranceProvider: text(form.insuranceProvider),
        insuranceNumber: text(form.insuranceNumber),
        emergencyContactName: text(form.emergencyContactName),
        emergencyContactPhone: onlyDigits(form.emergencyContactPhone) || undefined,
      });
      router.push("/patient/dashboard");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir o cadastro. A API está rodando?",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto max-w-xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-900">Criar conta</h1>
        <p className="mt-2 text-sm text-slate-500">
          Cadastro de paciente da Leperapia Clinic.
        </p>
      </div>

      <ol className="mb-6 flex items-center justify-center gap-2 text-xs">
        {STEPS.map((label, index) => {
          const number = index + 1;
          const done = step > number;
          const current = step === number;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex size-6 items-center justify-center rounded-full font-semibold ${
                  done || current
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? <Check className="size-3.5" /> : number}
              </span>
              <span
                className={
                  current ? "font-medium text-slate-900" : "text-slate-500"
                }
              >
                {label}
              </span>
              {number < STEPS.length && (
                <span className="mx-1 h-px w-6 bg-slate-200" />
              )}
            </li>
          );
        })}
      </ol>

      <form
        onSubmit={(event) => event.preventDefault()}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        {step === 1 && (
          <>
            <FormField id="name" label="Nome completo">
              <input
                id="name"
                className={inputClassName}
                autoComplete="name"
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </FormField>
            <FormField id="email" label="E-mail">
              <input
                id="email"
                type="email"
                className={inputClassName}
                autoComplete="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            </FormField>
            <FormField
              id="password"
              label="Senha"
              hint="Mínimo de 8 caracteres."
            >
              <input
                id="password"
                type="password"
                className={inputClassName}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
              />
            </FormField>
            <FormField id="confirmPassword" label="Confirmar senha">
              <input
                id="confirmPassword"
                type="password"
                className={inputClassName}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => update({ confirmPassword: e.target.value })}
              />
            </FormField>
          </>
        )}

        {step === 2 && (
          <>
            <FormField id="cpf" label="CPF">
              <input
                id="cpf"
                className={inputClassName}
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => update({ cpf: maskCpf(e.target.value) })}
              />
            </FormField>
            <FormField id="birthDate" label="Data de nascimento">
              <input
                id="birthDate"
                type="date"
                lang="pt-BR"
                className={inputClassName}
                value={form.birthDate}
                onChange={(e) => {
                  update({ birthDate: e.target.value });
                  setMinor(isUnder18(e.target.value));
                }}
              />
            </FormField>
            <FormField id="phone" label="Telefone / WhatsApp">
              <input
                id="phone"
                className={inputClassName}
                inputMode="tel"
                placeholder="(12) 99999-9999"
                value={form.phone}
                onChange={(e) => update({ phone: maskPhone(e.target.value) })}
              />
            </FormField>
          </>
        )}

        {step === 3 && (
          <>
            {minor && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Como o paciente é menor de 18 anos, informe os dados do
                responsável legal.
              </p>
            )}
            <FormField
              id="emergencyName"
              label={
                minor
                  ? "Nome do responsável legal"
                  : "Contato de emergência (opcional)"
              }
            >
              <input
                id="emergencyName"
                className={inputClassName}
                value={form.emergencyContactName}
                onChange={(e) =>
                  update({ emergencyContactName: e.target.value })
                }
              />
            </FormField>
            <FormField id="emergencyPhone" label="Telefone do contato">
              <input
                id="emergencyPhone"
                className={inputClassName}
                inputMode="tel"
                value={form.emergencyContactPhone}
                onChange={(e) =>
                  update({ emergencyContactPhone: maskPhone(e.target.value) })
                }
              />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="insurance" label="Plano de saúde (opcional)">
                <input
                  id="insurance"
                  className={inputClassName}
                  value={form.insuranceProvider}
                  onChange={(e) => update({ insuranceProvider: e.target.value })}
                />
              </FormField>
              <FormField id="insuranceNumber" label="Nº da carteirinha">
                <input
                  id="insuranceNumber"
                  className={inputClassName}
                  value={form.insuranceNumber}
                  onChange={(e) => update({ insuranceNumber: e.target.value })}
                />
              </FormField>
            </div>
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                className="mt-0.5 size-4 rounded border-slate-300"
                checked={form.consent}
                onChange={(e) => update({ consent: e.target.checked })}
              />
              <span>
                Autorizo o uso dos meus dados pessoais e de saúde pela
                Leperapia Clinic para fins de atendimento e gestão de
                consultas, conforme a LGPD.
              </span>
            </label>
          </>
        )}

        {error && <Alert kind="error">{error}</Alert>}

        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
              disabled={submitting}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
          ) : (
            <Link
              href="/auth/login"
              className="text-sm text-slate-500 transition hover:text-slate-900"
            >
              Já tenho conta
            </Link>
          )}

          {step < 3 ? (
            <Button type="button" onClick={next}>
              Continuar
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Concluir cadastro
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
