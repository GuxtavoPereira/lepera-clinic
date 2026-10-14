"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  FormField,
  FormSection,
  inputClassName,
} from "@/components/forms/form-field";
import {
  PersonalFields,
  type PersonalFormState,
} from "@/components/profile/personal-fields";
import { ApiError, apiFetch } from "@/lib/api-client";
import {
  isValidBirthDate,
  isValidCpf,
  maskCpf,
  onlyDigits,
  toDateInput,
} from "@/lib/br-format";

type Me = {
  name: string;
  email: string;
  cpf: string | null;
  birthDate: string | null;
  receptionist: { extension: string | null } | null;
};

export default function ReceptionProfilePage() {
  const [email, setEmail] = useState("");
  const [cpfLocked, setCpfLocked] = useState(false);
  const [personal, setPersonal] = useState<PersonalFormState>({
    name: "",
    cpf: "",
    birthDate: "",
  });
  const [extension, setExtension] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function apply(me: Me) {
    setEmail(me.email);
    setCpfLocked(!!me.cpf);
    setPersonal({
      name: me.name,
      cpf: maskCpf(me.cpf ?? ""),
      birthDate: toDateInput(me.birthDate),
    });
    setExtension(me.receptionist?.extension ?? "");
  }

  useEffect(() => {
    let active = true;
    void apiFetch<Me>("/profile/me")
      .then((me) => {
        if (active) apply(me);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Não foi possível carregar o perfil.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    if (personal.name.trim().length < 2) {
      setError("Informe o nome completo.");
      return;
    }
    if (!cpfLocked && !isValidCpf(personal.cpf)) {
      setError("Informe um CPF válido.");
      return;
    }
    if (personal.birthDate && !isValidBirthDate(personal.birthDate)) {
      setError("Data de nascimento inválida.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/receptionists/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: personal.name.trim(),
          birthDate: personal.birthDate || undefined,
          ...(!cpfLocked ? { cpf: onlyDigits(personal.cpf) } : {}),
          extension: extension.trim() || null,
        }),
      });
      apply(await apiFetch<Me>("/profile/me"));
      setNotice("Perfil atualizado.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível salvar o perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <User className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Meu perfil</h1>
          <p className="mt-1 text-sm text-slate-500">
            Seus dados de acesso e de contato na clínica.
          </p>
        </div>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando perfil...</p>
      ) : (
        <form
          onSubmit={(event) => event.preventDefault()}
          className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <FormSection title="Dados pessoais">
            <PersonalFields
              value={personal}
              onChange={(patch) => {
                setPersonal((current) => ({ ...current, ...patch }));
                setNotice(null);
              }}
              email={email}
              cpfLocked={cpfLocked}
            />
          </FormSection>

          <FormSection title="Trabalho">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="extension" label="Ramal">
                <input
                  id="extension"
                  className={inputClassName}
                  value={extension}
                  onChange={(e) => setExtension(e.target.value)}
                />
              </FormField>
            </div>
          </FormSection>

          <div className="flex justify-end border-t border-slate-100 pt-5">
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
              Salvar alterações
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
