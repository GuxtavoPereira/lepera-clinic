"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  guardianRelationshipSuggestions,
  isValidCpf,
  privateCpf,
} from "@lepera/contracts";
import { onlyDigits } from "@/lib/br-format";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDatePtBr } from "@/lib/date-format";
import { Button } from "@/components/ui/button";
import { FormField, inputClassName } from "@/components/forms/form-field";
import { SocialNameFields } from "@/components/profile/social-name-fields";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PortalPatient } from "@/components/guardian/guardian-types";

type NewDependentForm = {
  name: string;
  socialName: string;
  useSocialName: boolean;
  cpf: string;
  birthDate: string;
  relationship: string;
  insuranceProvider: string;
  insuranceNumber: string;
};

const EMPTY_DEP: NewDependentForm = {
  name: "",
  socialName: "",
  useSocialName: false,
  cpf: "",
  birthDate: "",
  relationship: "Mãe",
  insuranceProvider: "",
  insuranceNumber: "",
};

export default function GuardianDashboardPage() {
  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<NewDependentForm>(EMPTY_DEP);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefresh((v) => v + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<{ items: PortalPatient[] }>("/portal/patients", {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) setPatients(data.items);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar os dependentes vinculados.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  async function handleAddDependent(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setFormError(null);

    const cpfDigits = onlyDigits(form.cpf);
    if (form.name.trim().length < 2) {
      setFormError("Informe o nome civil completo do dependente.");
      return;
    }
    if (!isValidCpf(cpfDigits)) {
      setFormError("Informe um CPF válido para o dependente.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) {
      setFormError("Informe a data de nascimento do dependente.");
      return;
    }
    if (form.relationship.trim().length < 2) {
      setFormError("Informe o parentesco ou vínculo.");
      return;
    }

    setSaving(true);
    try {
      const created = await apiFetch<PortalPatient>("/portal/dependents", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          socialName: form.socialName.trim() || null,
          useSocialName: form.useSocialName,
          cpf: cpfDigits,
          birthDate: form.birthDate,
          relationship: form.relationship.trim(),
          ...(form.insuranceProvider.trim()
            ? { insuranceProvider: form.insuranceProvider.trim() }
            : {}),
          ...(form.insuranceNumber.trim()
            ? { insuranceNumber: form.insuranceNumber.trim() }
            : {}),
        }),
      });
      setPatients((prev) => [...prev, created]);
      setSuccess(`Dependente ${created.name} adicionado com sucesso.`);
      setForm(EMPTY_DEP);
      setSheetOpen(false);
    } catch (err) {
      setFormError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível adicionar o dependente.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Painel do responsável
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie seus dependentes vinculados, acompanhe agendamentos e acesse
            as devolutivas liberadas pelos profissionais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="min-h-11"
            onClick={reload}
            disabled={loading}
          >
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            Atualizar
          </Button>
          <Button
            className="min-h-11"
            onClick={() => {
              setForm(EMPTY_DEP);
              setFormError(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="size-4" />
            Adicionar dependente
          </Button>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <p>
          Sua conta de responsável é independente: os dependentes menores não
          possuem login próprio e as anotações clínicas internas dos psicólogos
          permanecem protegidas por sigilo. Aqui você acompanha consultas e lê
          as <strong>devolutivas</strong> formalmente liberadas.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground"
        >
          {success}
        </p>
      )}

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
          Carregando dependentes...
        </p>
      ) : patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum dependente vinculado ativo no momento.
          </p>
          <Button
            className="mt-4 min-h-11"
            onClick={() => setSheetOpen(true)}
          >
            <Plus className="size-4" />
            Adicionar primeiro dependente
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {patients.map((patient) => (
            <article
              key={patient.patientId}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserRound className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">
                        {patient.name}
                      </h2>
                      {patient.civilName &&
                        patient.civilName !== patient.name && (
                          <p className="text-xs text-muted-foreground">
                            Nome civil: {patient.civilName}
                          </p>
                        )}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                    {patient.relationship}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">CPF</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {privateCpf(patient.cpf)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Nascimento</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {patient.birthDate
                        ? `${formatDatePtBr(patient.birthDate)}${patient.age !== null ? ` (${patient.age} anos)` : ""}`
                        : "Não informado"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Convênio</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {patient.insuranceProvider ?? "Particular"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Acesso</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {patient.isSelf
                        ? "Titular"
                        : "Gerido pelo responsável"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Link
                  href={`/guardian/appointments?patientId=${patient.patientId}`}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  <Calendar className="size-4" />
                  Agendamentos
                </Link>
                <Link
                  href={`/guardian/feedback?patientId=${patient.patientId}`}
                  className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  <FileText className="size-4" />
                  Devolutivas
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b p-6 pr-12">
            <SheetTitle>Adicionar dependente menor</SheetTitle>
            <SheetDescription>
              Cadastre um dependente menor de 18 anos com CPF próprio. O
              dependente não recebe login próprio.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleAddDependent} className="space-y-4 p-6">
            <FormField
              id="dep-name"
              label="Nome civil completo do dependente"
            >
              <input
                id="dep-name"
                required
                className={inputClassName}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </FormField>
            <SocialNameFields
              value={{
                socialName: form.socialName,
                useSocialName: form.useSocialName,
              }}
              onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
              idPrefix="dep"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="dep-cpf" label="CPF do dependente">
                <input
                  id="dep-cpf"
                  required
                  inputMode="numeric"
                  placeholder="Somente números"
                  className={inputClassName}
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </FormField>
              <FormField id="dep-birth" label="Data de nascimento">
                <input
                  id="dep-birth"
                  type="date"
                  required
                  className={inputClassName}
                  value={form.birthDate}
                  onChange={(e) =>
                    setForm({ ...form, birthDate: e.target.value })
                  }
                />
              </FormField>
            </div>
            <FormField id="dep-relationship" label="Parentesco / vínculo">
              <input
                id="dep-relationship"
                required
                list="dep-relationship-options"
                className={inputClassName}
                value={form.relationship}
                onChange={(e) =>
                  setForm({ ...form, relationship: e.target.value })
                }
              />
              <datalist id="dep-relationship-options">
                {guardianRelationshipSuggestions.map((opt) => (
                  <option key={opt} value={opt} />
                ))}
              </datalist>
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="dep-insurance" label="Convênio (opcional)">
                <input
                  id="dep-insurance"
                  className={inputClassName}
                  value={form.insuranceProvider}
                  onChange={(e) =>
                    setForm({ ...form, insuranceProvider: e.target.value })
                  }
                />
              </FormField>
              <FormField id="dep-insurance-num" label="Carteirinha (opcional)">
                <input
                  id="dep-insurance-num"
                  className={inputClassName}
                  value={form.insuranceNumber}
                  onChange={(e) =>
                    setForm({ ...form, insuranceNumber: e.target.value })
                  }
                />
              </FormField>
            </div>
            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
              >
                {formError}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={saving}
                onClick={() => setSheetOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="min-h-11" disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Salvar dependente
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
