"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatDateTimePtBr } from "@/lib/date-format";
import { Button } from "@/components/ui/button";
import { DashboardLoading } from "@/components/dashboard/dashboard-ui";
import {
  DependentSelector,
  type PortalFeedbackDetail,
  type PortalFeedbackSummary,
  type PortalPatient,
} from "@/components/guardian/guardian-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export default function GuardianFeedbackPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <GuardianFeedbackContent />
    </Suspense>
  );
}

function GuardianFeedbackContent() {
  const params = useSearchParams();
  const initialPatientId = params.get("patientId") ?? "";

  const [patients, setPatients] = useState<PortalPatient[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialPatientId);
  const [items, setItems] = useState<PortalFeedbackSummary[]>([]);
  const [detail, setDetail] = useState<PortalFeedbackDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshList, setRefreshList] = useState(0);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<{ items: PortalPatient[] }>("/portal/patients", {
      signal: controller.signal,
    })
      .then((res) => {
        if (controller.signal.aborted) return;
        setPatients(res.items);
        const match = res.items.find((p) => p.patientId === initialPatientId);
        setSelectedId(match?.patientId ?? res.items[0]?.patientId ?? "");
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
  }, [initialPatientId]);

  const reloadList = useCallback(() => {
    setLoadingList(true);
    setError(null);
    setDetail(null);
    setRefreshList((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void apiFetch<{ items: PortalFeedbackSummary[] }>(
      `/portal/patients/${selectedId}/feedback`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (!controller.signal.aborted) setItems(res.items);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar as devolutivas liberadas.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingList(false);
      });
    return () => controller.abort();
  }, [selectedId, refreshList]);

  async function handleOpen(docId: string) {
    if (!selectedId) return;
    setLoadingDetail(docId);
    setError(null);
    try {
      const data = await apiFetch<PortalFeedbackDetail>(
        `/portal/patients/${selectedId}/feedback/${docId}`,
      );
      setDetail(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível abrir esta devolutiva.",
      );
    } finally {
      setLoadingDetail(null);
    }
  }

  async function handleDownloadPdf(docId: string, version: number) {
    if (!selectedId) return;
    setDownloadingId(docId);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/portal/patients/${selectedId}/feedback/${docId}/export`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          typeof body?.message === "string"
            ? body.message
            : "Não foi possível baixar o PDF da devolutiva.",
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `devolutiva-v${version}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível baixar o PDF da devolutiva.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Devolutivas de menores
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Leia e baixe em PDF as devolutivas assinadas e liberadas pelo
            psicólogo para acompanhamento do responsável.
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={loadingList || !selectedId}
          onClick={reloadList}
        >
          <RefreshCw
            className={loadingList ? "size-4 animate-spin" : "size-4"}
          />
          Atualizar
        </Button>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
        <p>
          Por sigilo profissional, apenas documentos do tipo{" "}
          <strong>Devolutiva para responsáveis</strong> assinados e
          explicitamente liberados pelo psicólogo são exibidos nesta tela.
          Anotações internas e evoluções clínicas de trabalho não ficam visíveis
          aqui.
        </p>
      </div>

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
          Carregando...
        </p>
      ) : (
        <>
          <DependentSelector
            patients={patients}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setDetail(null);
            }}
          />

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {loadingList ? (
            <p
              role="status"
              className="flex items-center gap-2 py-6 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              Buscando devolutivas liberadas...
            </p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma devolutiva foi liberada para este dependente até o
              momento.
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((doc) => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <h2 className="font-semibold text-foreground">
                        {doc.title}
                      </h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                        v{doc.version}
                      </span>
                      {doc.documentNumber && (
                        <span className="text-xs text-muted-foreground">
                          Nº {doc.documentNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {doc.doctor.user.name} · {doc.doctor.specialty} ·{" "}
                      {doc.doctor.licenseNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {doc.releasedAt
                        ? `Liberada em ${formatDateTimePtBr(doc.releasedAt)}`
                        : doc.signedAt
                          ? `Assinada em ${formatDateTimePtBr(doc.signedAt)}`
                          : `Atualizada em ${formatDateTimePtBr(doc.updatedAt)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-10"
                      disabled={loadingDetail === doc.id}
                      onClick={() => void handleOpen(doc.id)}
                    >
                      {loadingDetail === doc.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                      Visualizar
                    </Button>
                    <Button
                      size="sm"
                      className="min-h-10"
                      disabled={downloadingId === doc.id}
                      onClick={() => void handleDownloadPdf(doc.id, doc.version)}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      Baixar PDF
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {detail && (
            <article className="space-y-5 rounded-2xl border border-primary/30 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    Devolutiva assinada · v{detail.version}
                    {detail.documentNumber ? ` · Nº ${detail.documentNumber}` : ""}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">
                    {detail.title}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Dependente: <strong>{detail.patient.name}</strong> ·
                    Profissional: {detail.doctor.name} ({detail.doctor.licenseNumber}
                    )
                  </p>
                </div>
                <Button
                  size="sm"
                  className="min-h-10"
                  disabled={downloadingId === detail.id}
                  onClick={() =>
                    void handleDownloadPdf(detail.id, detail.version)
                  }
                >
                  {downloadingId === detail.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Baixar PDF
                </Button>
              </div>

              <div className="space-y-4">
                {detail.sections.map((section) => (
                  <section
                    key={section.key}
                    className="rounded-xl bg-muted/40 p-4"
                  >
                    <h3 className="text-sm font-semibold text-foreground">
                      {section.label}
                    </h3>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">
                      {section.value || "—"}
                    </p>
                  </section>
                ))}
              </div>
            </article>
          )}
        </>
      )}
    </div>
  );
}
