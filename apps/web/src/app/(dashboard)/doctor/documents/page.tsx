"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  clinicalDocumentStatusLabels,
  clinicalDocumentStatuses,
  clinicalDocumentTemplates,
  clinicalDocumentTypeLabels,
  clinicalDocumentTypes,
  clinicalDocumentVisibilityLabels,
  type ClinicalDocumentStatus,
  type ClinicalDocumentType,
  type ClinicalDocumentVisibility,
} from "@lepera/contracts";
import { Button } from "@/components/ui/button";
import { DashboardLoading } from "@/components/dashboard/dashboard-ui";
import { Alert, FormField, inputClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type DocumentListItem = {
  id: string;
  patientId: string;
  type: ClinicalDocumentType;
  title: string;
  documentNumber: string | null;
  version: number;
  status: ClinicalDocumentStatus;
  visibility: ClinicalDocumentVisibility;
  signedAt: string | null;
  updatedAt: string;
  patient: { user: { name: string } };
};

type DoctorPatientOption = {
  id: string;
  user: { name: string };
};

export default function DoctorDocumentsPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DoctorDocumentsWorkspace />
    </Suspense>
  );
}

function DoctorDocumentsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get("patientId") ?? "";

  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [patients, setPatients] = useState<DoctorPatientOption[]>([]);
  const [patientFilter, setPatientFilter] = useState(initialPatientId);
  const [typeFilter, setTypeFilter] = useState<ClinicalDocumentType | "">("");
  const [statusFilter, setStatusFilter] = useState<ClinicalDocumentStatus | "">(
    "",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de novo documento
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newPatientId, setNewPatientId] = useState(initialPatientId);
  const [newType, setNewType] =
    useState<ClinicalDocumentType>("INITIAL_INTERVIEW");
  const [newTitle, setNewTitle] = useState(
    clinicalDocumentTemplates.INITIAL_INTERVIEW.defaultTitle,
  );
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<{ items: DoctorPatientOption[] }>(
      "/patients/mine?page=1&pageSize=100",
    )
      .then((res) => {
        if (active) setPatients(res.items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (patientFilter) params.set("patientId", patientFilter);
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    const qs = params.toString();

    void apiFetch<{ items: DocumentListItem[] }>(
      `/clinical-documents${qs ? `?${qs}` : ""}`,
    )
      .then((res) => {
        if (!active) return;
        setDocuments(res.items);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível carregar os documentos.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [patientFilter, typeFilter, statusFilter]);

  function selectType(next: ClinicalDocumentType) {
    setNewType(next);
    setNewTitle(clinicalDocumentTemplates[next].defaultTitle);
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!newPatientId) {
      setCreateError("Selecione o paciente vinculado.");
      return;
    }
    if (newTitle.trim().length < 2) {
      setCreateError("Informe um título com pelo menos 2 caracteres.");
      return;
    }

    setSubmitting(true);
    setCreateError(null);
    const template = clinicalDocumentTemplates[newType];
    try {
      const created = await apiFetch<{ id: string }>("/clinical-documents", {
        method: "POST",
        body: JSON.stringify({
          patientId: newPatientId,
          type: newType,
          title: newTitle.trim(),
          sections: template.sections.map((section) => ({
            key: section.key,
            label: section.label,
            value: "",
          })),
        }),
      });
      router.push(`/doctor/documents/${created.id}`);
    } catch (cause) {
      setCreateError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível criar o rascunho.",
      );
      setSubmitting(false);
    }
  }

  const selectedTemplate = clinicalDocumentTemplates[newType];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Documentos psicológicos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Laudos, relatórios, Rapor (entrevista inicial), avaliações,
              anotações, diário de campo e devolutivas cifrados e versionados.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="min-h-11"
          onClick={() => {
            setCreateError(null);
            if (!newPatientId && patientFilter) setNewPatientId(patientFilter);
            setCreatingOpen(true);
          }}
        >
          <Plus className="size-4" />
          Novo documento
        </Button>
      </header>

      <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <span>
          O conteúdo dos documentos é gravado criptografado e restrito ao
          profissional autor. Revise cada modelo técnico antes de assinar ou
          exportar.
        </span>
      </p>

      <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-3">
        <FormField id="doc-filter-patient" label="Paciente">
          <select
            id="doc-filter-patient"
            className={inputClassName}
            value={patientFilter}
            onChange={(e) => {
              setLoading(true);
              setPatientFilter(e.target.value);
            }}
          >
            <option value="">Todos os meus pacientes</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.user.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="doc-filter-type" label="Tipo de documento">
          <select
            id="doc-filter-type"
            className={inputClassName}
            value={typeFilter}
            onChange={(e) => {
              setLoading(true);
              setTypeFilter(e.target.value as ClinicalDocumentType | "");
            }}
          >
            <option value="">Todos os tipos</option>
            {clinicalDocumentTypes.map((type) => (
              <option key={type} value={type}>
                {clinicalDocumentTypeLabels[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField id="doc-filter-status" label="Situação">
          <select
            id="doc-filter-status"
            className={inputClassName}
            value={statusFilter}
            onChange={(e) => {
              setLoading(true);
              setStatusFilter(e.target.value as ClinicalDocumentStatus | "");
            }}
          >
            <option value="">Todas</option>
            {clinicalDocumentStatuses.map((status) => (
              <option key={status} value={status}>
                {clinicalDocumentStatusLabels[status]}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando documentos…
        </p>
      ) : documents.length === 0 ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <FileText className="mx-auto size-8 text-muted-foreground" />
          <p className="font-medium text-foreground">
            Nenhum documento encontrado
          </p>
          <p className="text-sm text-muted-foreground">
            Clique em <strong>Novo documento</strong> para iniciar um rascunho a
            partir dos modelos disponíveis.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-foreground">
                    {doc.title}
                  </h2>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    v{doc.version}
                  </span>
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {clinicalDocumentTypeLabels[doc.type]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Paciente: <strong className="text-foreground">{doc.patient.user.name}</strong>
                  {doc.documentNumber ? ` · Nº ${doc.documentNumber}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Atualizado em {formatDateTimePtBr(doc.updatedAt)} ·{" "}
                  {clinicalDocumentVisibilityLabels[doc.visibility]}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    doc.status === "SIGNED"
                      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                      : doc.status === "SUPERSEDED"
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                  }`}
                >
                  {doc.status === "SIGNED" && <Lock className="size-3" />}
                  {clinicalDocumentStatusLabels[doc.status]}
                </span>
                <Link
                  href={`/doctor/documents/${doc.id}`}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition hover:bg-accent"
                >
                  {doc.status === "DRAFT" ? "Preencher" : "Abrir"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {creatingOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-doc-heading"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <h2 id="new-doc-heading" className="text-lg font-semibold">
                  Novo documento psicológico
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Escolha o paciente e o modelo estruturado. O documento inicia
                  como rascunho interno.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={() => setCreatingOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>

            <form
              onSubmit={(event) => void handleCreate(event)}
              className="mt-5 space-y-5"
            >
              <FormField id="new-doc-patient" label="Paciente vinculado *">
                <select
                  id="new-doc-patient"
                  className={inputClassName}
                  value={newPatientId}
                  disabled={submitting}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="new-doc-type" label="Modelo do documento *">
                <select
                  id="new-doc-type"
                  className={inputClassName}
                  value={newType}
                  disabled={submitting}
                  onChange={(e) =>
                    selectType(e.target.value as ClinicalDocumentType)
                  }
                >
                  {clinicalDocumentTypes.map((type) => (
                    <option key={type} value={type}>
                      {clinicalDocumentTypeLabels[type]}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="rounded-xl border border-border bg-muted/40 p-3.5 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">
                  {selectedTemplate.label}
                </p>
                <p className="mt-1">{selectedTemplate.shortDescription}</p>
                <p className="mt-2">
                  Seções do modelo:{" "}
                  {selectedTemplate.sections.map((s) => s.label).join(" · ")}.
                </p>
              </div>

              <FormField id="new-doc-title" label="Título do documento *">
                <input
                  id="new-doc-title"
                  className={inputClassName}
                  maxLength={160}
                  value={newTitle}
                  disabled={submitting}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </FormField>

              {createError && <Alert kind="error">{createError}</Alert>}

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => setCreatingOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Criar rascunho
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
