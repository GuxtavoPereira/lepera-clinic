"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, FormField, inputClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import {
  isUnder18,
  isValidBirthDate,
  isValidCpf,
  isValidPhone,
  maskCpf,
  maskPhone,
  onlyDigits,
} from "@/lib/br-format";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

type Form = {
  name: string;
  email: string;
  password: string;
  cpf: string;
  birthDate: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

const EMPTY: Form = {
  name: "",
  email: "",
  password: "",
  cpf: "",
  birthDate: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

/** Cadastro de paciente feito pela recepção (atendimento presencial). */
export function NewPatientSheet({ open, onOpenChange, onCreated }: Props) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [minor, setMinor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  function update(patch: Partial<Form>) {
    setForm((current) => ({ ...current, ...patch }));
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const problem =
      form.name.trim().length < 2
        ? "Informe o nome completo."
        : !/^\S+@\S+\.\S+$/.test(form.email.trim())
          ? "E-mail inválido."
          : form.password.length < 8
            ? "A senha provisória precisa de pelo menos 8 caracteres."
            : !isValidCpf(form.cpf)
              ? "CPF inválido."
              : !isValidBirthDate(form.birthDate)
                ? "Data de nascimento inválida."
                : !isValidPhone(form.phone)
                  ? "Telefone inválido (DDD + número)."
                  : minor &&
                      (form.emergencyContactName.trim().length < 2 ||
                        !isValidPhone(form.emergencyContactPhone))
                    ? "Menor de 18 anos: informe nome e telefone do responsável legal."
                    : null;
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiFetch("/patients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          cpf: onlyDigits(form.cpf),
          birthDate: form.birthDate,
          phone: onlyDigits(form.phone),
          emergencyContactName: form.emergencyContactName.trim() || undefined,
          emergencyContactPhone:
            onlyDigits(form.emergencyContactPhone) || undefined,
        }),
      });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível cadastrar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Novo paciente</SheetTitle>
            <SheetDescription>
              Endereço, plano de saúde e demais dados podem ser completados
              depois, na ficha do paciente.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4">
            <FormField id="np-name" label="Nome completo">
              <input
                id="np-name"
                className={inputClassName}
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </FormField>
            <FormField id="np-email" label="E-mail">
              <input
                id="np-email"
                type="email"
                className={inputClassName}
                value={form.email}
                onChange={(e) => update({ email: e.target.value })}
              />
            </FormField>
            <FormField
              id="np-password"
              label="Senha provisória"
              hint="Informe ao paciente; ele pode trocá-la em Segurança."
            >
              <input
                id="np-password"
                type="password"
                className={inputClassName}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
              />
            </FormField>
            <FormField id="np-cpf" label="CPF">
              <input
                id="np-cpf"
                className={inputClassName}
                inputMode="numeric"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => update({ cpf: maskCpf(e.target.value) })}
              />
            </FormField>
            <FormField id="np-birth" label="Data de nascimento">
              <input
                id="np-birth"
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
            <FormField id="np-phone" label="Telefone / WhatsApp">
              <input
                id="np-phone"
                className={inputClassName}
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update({ phone: maskPhone(e.target.value) })}
              />
            </FormField>

            {minor && (
              <>
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Paciente menor de 18 anos: responsável legal obrigatório.
                </p>
                <FormField id="np-resp-name" label="Nome do responsável">
                  <input
                    id="np-resp-name"
                    className={inputClassName}
                    value={form.emergencyContactName}
                    onChange={(e) =>
                      update({ emergencyContactName: e.target.value })
                    }
                  />
                </FormField>
                <FormField id="np-resp-phone" label="Telefone do responsável">
                  <input
                    id="np-resp-phone"
                    className={inputClassName}
                    inputMode="tel"
                    value={form.emergencyContactPhone}
                    onChange={(e) =>
                      update({
                        emergencyContactPhone: maskPhone(e.target.value),
                      })
                    }
                  />
                </FormField>
              </>
            )}

            {error && <Alert kind="error">{error}</Alert>}
          </div>

          <SheetFooter className="flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Cadastrar paciente
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
