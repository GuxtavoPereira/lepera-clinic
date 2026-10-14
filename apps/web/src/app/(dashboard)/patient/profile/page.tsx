"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/forms/form-field";
import {
  buildPatientPayload,
  EMPTY_PATIENT_FORM,
  PatientFields,
  patientToForm,
  validatePatientForm,
  type PatientFormState,
  type PatientSource,
} from "@/components/patients/patient-fields";
import { ApiError, apiFetch } from "@/lib/api-client";

type Me = PatientSource["user"] & {
  email: string;
  patient: PatientSource["patient"] | null;
};

export default function PatientProfilePage() {
  const [email, setEmail] = useState("");
  const [cpfLocked, setCpfLocked] = useState(false);
  const [initial, setInitial] = useState<PatientFormState>(EMPTY_PATIENT_FORM);
  const [form, setForm] = useState<PatientFormState>(EMPTY_PATIENT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function apply(me: Me) {
    if (!me.patient) return;
    const next = patientToForm({ user: me, patient: me.patient });
    setEmail(me.email);
    setCpfLocked(!!me.cpf);
    setInitial(next);
    setForm(next);
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
    const problem = validatePatientForm(form, { cpfRequired: !cpfLocked });
    if (problem) {
      setError(problem);
      setNotice(null);
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/patients/me", {
        method: "PATCH",
        body: JSON.stringify(buildPatientPayload(form, initial, { cpfLocked })),
      });
      const me = await apiFetch<Me>("/profile/me");
      apply(me);
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
            Mantenha seus dados atualizados para facilitar o atendimento.
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
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <PatientFields
            value={form}
            onChange={(patch) => {
              setForm((current) => ({ ...current, ...patch }));
              setNotice(null);
            }}
            email={email}
            cpfLocked={cpfLocked}
          />
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
