"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CopyPlus,
  Download,
  Loader2,
  Lock,
  Save,
  Share2,
} from "lucide-react";
import {
  clinicalDocumentStatusLabels,
  clinicalDocumentTemplates,
  clinicalDocumentTypeLabels,
  clinicalDocumentVisibilityLabels,
  isInternalOnlyDocumentType,
  type ClinicalDocumentStatus,
  type ClinicalDocumentType,
  type ClinicalDocumentVisibility,
} from "@lepera/contracts";
import { Button } from "@/components/ui/button";
import {
  Alert,
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatDateTimePtBr } from "@/lib/date-format";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type Section = { key: string; label: string; value: string };

type ClinicalDocumentDetail = {
  id: string;
  patientId: string;
  appointmentId: string | null;
  type: ClinicalDocumentType;
  title: string;
  documentNumber: string | null;
  version: number;
  previousVersionId: string | null;
  nextVersion: {
    id: string;
    version: number;
    status: ClinicalDocumentStatus;
  } | null;
  status: ClinicalDocumentStatus;
  visibility: ClinicalDocumentVisibility;
  signedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: { id: string; name: string };
  doctor: { name: string; licenseNumber: string; specialty: string };
  sections: Section[];
};

export default function DoctorDocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [doc, setDoc] = useState<ClinicalDocumentDetail | null>(null);
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmingSign, setConfirmingSign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function apply(next: ClinicalDocumentDetail) {
    setDoc(next);
    setTitle(next.title);
    setSections(next.sections);
  }

  useEffect(() => {
    let active = true;
    void apiFetch<ClinicalDocumentDetail>(`/clinical-documents/${id}`)
      .then((result) => {
        if (active) apply(result);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível carregar o documento.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Carregando documento…
      </p>
    );
  }

  if (!doc) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/doctor/documents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para documentos
        </Link>
        <Alert kind="error">{error ?? "Documento não encontrado."}</Alert>
      </div>
    );
  }

  const locked = doc.status !== "DRAFT";
  const internalOnly = isInternalOnlyDocumentType(doc.type);
  const template = clinicalDocumentTemplates[doc.type];
  const hasAnyContent = sections.some((s) => s.value.trim().length > 0);

  function updateSection(index: number, value: string) {
    setSections((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, value } : item)),
    );
    setNotice(null);
  }

  async function saveDraft() {
    const updated = await apiFetch<ClinicalDocumentDetail>(
      `/clinical-documents/${doc!.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          sections,
        }),
      },
    );
    apply(updated);
    return updated;
  }

  async function handleSave() {
    if (title.trim().length < 2) {
      setError("Informe um título com pelo menos 2 caracteres.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveDraft();
      setNotice("Rascunho salvo.");
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível salvar o rascunho.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSign() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveDraft();
      const signed = await apiFetch<ClinicalDocumentDetail>(
        `/clinical-documents/${doc!.id}/sign`,
        { method: "POST" },
      );
      apply(signed);
      setConfirmingSign(false);
      setNotice(
        "Documento assinado. O conteúdo desta versão ficou bloqueado para edição.",
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível assinar o documento.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRevise() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const nextVersion = await apiFetch<ClinicalDocumentDetail>(
        `/clinical-documents/${doc!.id}/revise`,
        { method: "POST" },
      );
      router.push(`/doctor/documents/${nextVersion.id}`);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível criar uma nova revisão.",
      );
      setSaving(false);
    }
  }

  async function handleVisibility(visibility: ClinicalDocumentVisibility) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await apiFetch<ClinicalDocumentDetail>(
        `/clinical-documents/${doc!.id}/visibility`,
        {
          method: "PATCH",
          body: JSON.stringify({ visibility }),
        },
      );
      apply(updated);
      setNotice(
        visibility === "INTERNAL"
          ? "Documento mantido como interno."
          : `Visibilidade atualizada: ${clinicalDocumentVisibilityLabels[visibility]}.`,
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível atualizar a liberação.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/clinical-documents/${doc!.id}/export`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) {
        throw new Error("Não foi possível exportar o PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `documento-v${doc!.version}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível exportar o PDF.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/doctor/documents"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar para documentos
        </Link>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {clinicalDocumentTypeLabels[doc.type]} · Versão {doc.version}
              {doc.documentNumber ? ` · Nº ${doc.documentNumber}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              {doc.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Paciente:{" "}
              <Link
                href={`/doctor/clinical-history/${doc.patient.id}`}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {doc.patient.name}
              </Link>{" "}
              · Autor: {doc.doctor.name} ({doc.doctor.licenseNumber})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                doc.status === "SIGNED"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                  : doc.status === "SUPERSEDED"
                    ? "bg-muted text-muted-foreground"
                    : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
              }`}
            >
              {locked && <Lock className="size-3" />}
              {clinicalDocumentStatusLabels[doc.status]}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exporting}
              onClick={() => void handleExportPdf()}
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {(doc.previousVersionId || doc.nextVersion) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          {doc.previousVersionId && (
            <Link
              href={`/doctor/documents/${doc.previousVersionId}`}
              className="font-medium text-primary underline underline-offset-4"
            >
              Ver versão anterior (v{doc.version - 1})
            </Link>
          )}
          {doc.nextVersion && (
            <Link
              href={`/doctor/documents/${doc.nextVersion.id}`}
              className="font-medium text-primary underline underline-offset-4"
            >
              Abrir revisão mais recente (v{doc.nextVersion.version} ·{" "}
              {clinicalDocumentStatusLabels[doc.nextVersion.status]})
            </Link>
          )}
        </div>
      )}

      <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Conteúdo cifrado no banco e leituras/exportações auditadas.{" "}
        {doc.signedAt
          ? `Assinado internamente em ${formatDateTimePtBr(doc.signedAt)}.`
          : "Depois de assinado, esta versão fica bloqueada; alterações posteriores geram uma nova revisão."}
      </p>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <form
        onSubmit={(event) => event.preventDefault()}
        className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
      >
        <FormField id="doc-title" label="Título do documento">
          <input
            id="doc-title"
            className={inputClassName}
            maxLength={160}
            value={title}
            disabled={locked || saving}
            onChange={(e) => {
              setTitle(e.target.value);
              setNotice(null);
            }}
          />
        </FormField>

        <div className="space-y-5">
          {sections.map((section, index) => {
            const templateSection = template.sections.find(
              (item) => item.key === section.key,
            );
            return (
              <FormField
                key={section.key}
                id={`doc-section-${section.key}`}
                label={section.label}
              >
                <textarea
                  id={`doc-section-${section.key}`}
                  className={`${textareaClassName} min-h-28 resize-y`}
                  value={section.value}
                  disabled={locked || saving}
                  placeholder={templateSection?.placeholder}
                  onChange={(e) => updateSection(index, e.target.value)}
                />
              </FormField>
            );
          })}
        </div>

        {doc.status === "DRAFT" && (
          <div className="space-y-3 border-t border-border pt-5">
            {confirmingSign ? (
              <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm text-foreground">
                  Assinar e finalizar a versão {doc.version}? Após a assinatura,
                  esta versão não poderá ser editada; se precisar ajustar depois,
                  use <strong>Criar nova revisão</strong>.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setConfirmingSign(false)}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSign()}
                  >
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Confirmar assinatura
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Salvar rascunho
                </Button>
                <Button
                  type="button"
                  disabled={saving || !hasAnyContent}
                  onClick={() => setConfirmingSign(true)}
                >
                  <Lock className="size-4" />
                  Assinar documento
                </Button>
              </div>
            )}
          </div>
        )}

        {doc.status === "SIGNED" && (
          <div className="flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Visibilidade: {clinicalDocumentVisibilityLabels[doc.visibility]}
              </p>
              <p className="text-xs text-muted-foreground">
                {internalOnly
                  ? "Este tipo de documento é de uso interno do profissional e não pode ser liberado."
                  : "Você decide explicitamente quando liberar uma versão assinada."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {!internalOnly && doc.type === "GUARDIAN_FEEDBACK" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    void handleVisibility(
                      doc.visibility === "GUARDIAN_RELEASED"
                        ? "INTERNAL"
                        : "GUARDIAN_RELEASED",
                    )
                  }
                >
                  <Share2 className="size-4" />
                  {doc.visibility === "GUARDIAN_RELEASED"
                    ? "Tornar interno"
                    : "Liberar ao responsável"}
                </Button>
              )}
              {!internalOnly && doc.type !== "GUARDIAN_FEEDBACK" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() =>
                    void handleVisibility(
                      doc.visibility === "PATIENT_RELEASED"
                        ? "INTERNAL"
                        : "PATIENT_RELEASED",
                    )
                  }
                >
                  <Share2 className="size-4" />
                  {doc.visibility === "PATIENT_RELEASED"
                    ? "Tornar interno"
                    : "Liberar ao paciente"}
                </Button>
              )}
              {!doc.nextVersion && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => void handleRevise()}
                >
                  <CopyPlus className="size-4" />
                  Criar nova revisão (v{doc.version + 1})
                </Button>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
