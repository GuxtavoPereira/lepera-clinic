"use client";

import { normalizeLattesUrl } from "@lepera/contracts";
import { useEffect, useRef, useState } from "react";
import { Loader2, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  FormField,
  FormSection,
  inputClassName,
  textareaClassName,
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
  doctor: {
    licenseNumber: string;
    specialty: string;
    clinicalApproach: string | null;
    bio: string | null;
    lattesUrl?: string | null;
    lattesSummary?: string | null;
    room: string | null;
  } | null;
};

export default function DoctorProfilePage() {
  const [email, setEmail] = useState("");
  const [cpfLocked, setCpfLocked] = useState(false);
  const [license, setLicense] = useState({ licenseNumber: "", specialty: "" });
  const [personal, setPersonal] = useState<PersonalFormState>({
    name: "",
    cpf: "",
    birthDate: "",
  });
  const [clinicalApproach, setClinicalApproach] = useState("");
  const [bio, setBio] = useState("");
  const [lattesUrl, setLattesUrl] = useState("");
  const [lattesSummary, setLattesSummary] = useState("");
  const [lattesError, setLattesError] = useState<string>();
  const lattesInput = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const [room, setRoom] = useState("");
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
    setLicense({
      licenseNumber: me.doctor?.licenseNumber ?? "",
      specialty: me.doctor?.specialty ?? "",
    });
    setClinicalApproach(me.doctor?.clinicalApproach ?? "");
    setBio(me.doctor?.bio ?? "");
    setLattesUrl(me.doctor?.lattesUrl ?? "");
    setLattesSummary(me.doctor?.lattesSummary ?? "");
    setRoom(me.doctor?.room ?? "");
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
    if (savingRef.current) return;
    setLattesError(undefined);
    if (lattesUrl.trim() && !normalizeLattesUrl(lattesUrl)) {
      setLattesError("Use o link público do Lattes com os 16 dígitos do currículo.");
      lattesInput.current?.focus();
      return;
    }
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

    const text = (value: string) => value.trim() || null;

    savingRef.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/doctors/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: personal.name.trim(),
          birthDate: personal.birthDate || undefined,
          ...(!cpfLocked ? { cpf: onlyDigits(personal.cpf) } : {}),
          clinicalApproach: text(clinicalApproach),
          bio: text(bio),
          lattesUrl: lattesUrl.trim() ? normalizeLattesUrl(lattesUrl) : null,
          lattesSummary: text(lattesSummary),
          room: text(room),
        }),
      });
      apply(await apiFetch<Me>("/profile/me"));
      setNotice("Perfil atualizado.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível salvar o perfil.",
      );
    } finally {
      savingRef.current = false;
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
            Dados pessoais e apresentação profissional.
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

          <FormSection
            title="Registro profissional"
            description="Alterado somente pela administração."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="license" label="CRP / CRM">
                <input
                  id="license"
                  className={inputClassName}
                  value={license.licenseNumber}
                  readOnly
                />
              </FormField>
              <FormField id="specialty" label="Especialidade">
                <input
                  id="specialty"
                  className={inputClassName}
                  value={license.specialty}
                  readOnly
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Atuação">
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="approach" label="Abordagem principal">
                <input
                  id="approach"
                  className={inputClassName}
                  placeholder="Ex.: Terapia Cognitivo-Comportamental"
                  value={clinicalApproach}
                  onChange={(e) => setClinicalApproach(e.target.value)}
                />
              </FormField>
              <FormField id="room" label="Sala / consultório">
                <input
                  id="room"
                  className={inputClassName}
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField id="bio" label="Apresentação">
                  <textarea
                    id="bio"
                    className={textareaClassName}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </FormSection>

          <FormSection title="Currículo Lattes (opcional)" description="O resumo e o link preenchidos aqui aparecem ao abrir seu card no site público. Deixe ambos vazios para ocultar esta seção.">
            <FormField id="lattes-url" label="Link do currículo" error={lattesError} hint="Copie o endereço público: https://lattes.cnpq.br/ seguido dos 16 dígitos.">
              <input ref={lattesInput} id="lattes-url" type="url" maxLength={200} className={inputClassName} value={lattesUrl} disabled={saving} aria-invalid={Boolean(lattesError)} onChange={(event) => { setLattesUrl(event.target.value); setLattesError(undefined); setNotice(null); }} />
            </FormField>
            <FormField id="lattes-summary" label="Resumo do currículo" hint="Até 2.000 caracteres. Informe formação e trajetória profissional que deseja compartilhar publicamente.">
              <textarea id="lattes-summary" maxLength={2000} rows={5} className={textareaClassName} value={lattesSummary} disabled={saving} onChange={(event) => { setLattesSummary(event.target.value); setNotice(null); }} />
            </FormField>
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
