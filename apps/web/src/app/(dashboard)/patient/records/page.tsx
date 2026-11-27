"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { clinicalDocumentTypeLabels } from "@lepera/contracts";
import { apiFetch, ApiError } from "@/lib/api-client";
import { getToken } from "@/lib/auth";
import { formatDatePtBr, formatDateTimePtBr } from "@/lib/date-format";
import { Button } from "@/components/ui/button";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

type ReleasedRecordSummary = {
  id: string;
  sessionSequence: number;
  signedAt: string | null;
  releasedAt: string | null;
  appointmentDate: string;
  durationMinutes: number;
  doctor: { name: string; licenseNumber: string; specialty: string };
};

type ReleasedRecordDetail = ReleasedRecordSummary & {
  mainComplaint: string | null;
  clinicalNotes: string | null;
  homework: string | null;
  diagnosticHypothesis: string | null;
  cid10: string | null;
  dsm5: string | null;
  cid11: string | null;
  dsm5Tr: string | null;
  approachUsed: string | null;
  therapeuticPlan: string | null;
  nextSessionDate: string | null;
  nextSessionRoom: string | null;
};

type ReleasedDocSummary = {
  id: string;
  type: keyof typeof clinicalDocumentTypeLabels;
  title: string;
  documentNumber: string | null;
  version: number;
  signedAt: string | null;
  releasedAt: string | null;
  doctor: { name: string; licenseNumber: string; specialty: string };
};

type ReleasedDocDetail = ReleasedDocSummary & {
  patient: { id: string; name: string };
  sections: Array<{ key: string; label: string; value: string }>;
};

export default function PatientRecordsPage() {
  const [records, setRecords] = useState<ReleasedRecordSummary[]>([]);
  const [documents, setDocuments] = useState<ReleasedDocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [openSession, setOpenSession] = useState<ReleasedRecordDetail | null>(
    null,
  );
  const [openDoc, setOpenDoc] = useState<ReleasedDocDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRefresh((v) => v + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<{
      records: ReleasedRecordSummary[];
      documents: ReleasedDocSummary[];
    }>("/patient-records", { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setRecords(res.records);
        setDocuments(res.documents);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar seu prontuário.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  async function viewSession(recordId: string) {
    setLoadingId(recordId);
    setError(null);
    try {
      const detail = await apiFetch<ReleasedRecordDetail>(
        `/patient-records/sessions/${recordId}`,
      );
      setOpenSession(detail);
      setOpenDoc(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível abrir o registro da sessão.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function viewDocument(docId: string) {
    setLoadingId(docId);
    setError(null);
    try {
      const detail = await apiFetch<ReleasedDocDetail>(
        `/patient-records/documents/${docId}`,
      );
      setOpenDoc(detail);
      setOpenSession(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível abrir o documento clínico.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function downloadPdf(docId: string, version: number) {
    setDownloadingId(docId);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/patient-records/documents/${docId}/export`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          typeof body?.message === "string"
            ? body.message
            : "Não foi possível baixar o PDF.",
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documento-clinico-v${version}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível baixar o PDF.",
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-foreground">
            <ClipboardList className="size-6 text-primary" />
            Meu prontuário
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulte as evoluções assinadas e os documentos clínicos liberados
            pelo seu psicólogo.
          </p>
        </div>
        <Button
          variant="outline"
          className="min-h-11"
          disabled={loading}
          onClick={reload}
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
          Atualizar
        </Button>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-950 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-teal-700 dark:text-teal-400" />
        <p>
          Por segurança e sigilo clínico, apenas evoluções assinadas e
          documentos explicitamente liberados pelo profissional são exibidos
          nesta área. Rascunhos, anotações internas de trabalho e documentos
          exclusivos de responsáveis permanecem separados e cada consulta fica
          registrada na auditoria.
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

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
          Carregando seu prontuário...
        </p>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Evoluções de sessão liberadas ({records.length})
            </h2>
            {records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhuma evolução de sessão foi liberada para consulta até o
                momento.
              </div>
            ) : (
              <ul className="space-y-3">
                {records.map((rec) => (
                  <li
                    key={rec.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        Sessão #{rec.sessionSequence} ·{" "}
                        {formatDateTimePtBr(rec.appointmentDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {rec.doctor.name} ({rec.doctor.licenseNumber}) ·{" "}
                        {rec.doctor.specialty}
                      </p>
                      {rec.releasedAt && (
                        <p className="text-xs text-muted-foreground">
                          Liberado em {formatDateTimePtBr(rec.releasedAt)}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-10"
                      disabled={loadingId === rec.id}
                      onClick={() => void viewSession(rec.id)}
                    >
                      {loadingId === rec.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                      Visualizar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {openSession && (
            <article className="space-y-4 rounded-2xl border border-primary/30 bg-card p-6 shadow-sm">
              <div className="border-b border-border pb-4">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Evolução assinada · Sessão #{openSession.sessionSequence}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  Atendimento de {formatDateTimePtBr(openSession.appointmentDate)}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Profissional: {openSession.doctor.name} (
                  {openSession.doctor.licenseNumber})
                  {openSession.signedAt
                    ? ` · Assinado em ${formatDateTimePtBr(openSession.signedAt)}`
                    : ""}
                </p>
              </div>
              <dl className="grid gap-4 text-sm">
                {[
                  ["Queixa / tema da sessão", openSession.mainComplaint],
                  ["Evolução clínica", openSession.clinicalNotes],
                  ["Tarefas e orientações para casa", openSession.homework],
                  ["Abordagem utilizada", openSession.approachUsed],
                  ["Plano terapêutico", openSession.therapeuticPlan],
                  ["Hipótese diagnóstica", openSession.diagnosticHypothesis],
                  ["CID-11", openSession.cid11],
                  ["DSM-5-TR", openSession.dsm5Tr],
                  ["CID-10 (registro histórico)", openSession.cid10],
                  ["DSM-5 (registro histórico)", openSession.dsm5],
                  [
                    "Próxima sessão combinada",
                    openSession.nextSessionDate
                      ? `${formatDatePtBr(openSession.nextSessionDate)}${openSession.nextSessionRoom ? ` · ${openSession.nextSessionRoom}` : ""}`
                      : null,
                  ],
                ]
                  .filter(([, val]) => Boolean(val))
                  .map(([label, val]) => (
                    <div key={label} className="rounded-xl bg-muted/40 p-4">
                      <dt className="text-xs font-semibold text-muted-foreground">
                        {label}
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap text-foreground">
                        {val}
                      </dd>
                    </div>
                  ))}
              </dl>
            </article>
          )}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Documentos clínicos liberados ({documents.length})
            </h2>
            {documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum documento clínico foi liberado para o seu portal até o
                momento.
              </div>
            ) : (
              <ul className="space-y-3">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="size-4 text-primary" />
                        <span className="font-semibold text-foreground">
                          {doc.title}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {clinicalDocumentTypeLabels[doc.type] ?? doc.type} · v
                          {doc.version}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {doc.doctor.name} ({doc.doctor.licenseNumber})
                        {doc.documentNumber ? ` · Nº ${doc.documentNumber}` : ""}
                      </p>
                      {doc.releasedAt && (
                        <p className="text-xs text-muted-foreground">
                          Liberado em {formatDateTimePtBr(doc.releasedAt)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-10"
                        disabled={loadingId === doc.id}
                        onClick={() => void viewDocument(doc.id)}
                      >
                        {loadingId === doc.id ? (
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
                        onClick={() => void downloadPdf(doc.id, doc.version)}
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
          </section>

          {openDoc && (
            <article className="space-y-4 rounded-2xl border border-primary/30 bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-primary">
                    {clinicalDocumentTypeLabels[openDoc.type] ?? openDoc.type} ·
                    v{openDoc.version}
                    {openDoc.documentNumber
                      ? ` · Nº ${openDoc.documentNumber}`
                      : ""}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-foreground">
                    {openDoc.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Profissional: {openDoc.doctor.name} (
                    {openDoc.doctor.licenseNumber})
                  </p>
                </div>
                <Button
                  size="sm"
                  className="min-h-10"
                  disabled={downloadingId === openDoc.id}
                  onClick={() => void downloadPdf(openDoc.id, openDoc.version)}
                >
                  {downloadingId === openDoc.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Baixar PDF
                </Button>
              </div>
              <div className="space-y-3">
                {openDoc.sections.map((section) => (
                  <section
                    key={section.key}
                    className="rounded-xl bg-muted/40 p-4"
                  >
                    <h4 className="text-sm font-semibold text-foreground">
                      {section.label}
                    </h4>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">
                      {section.value || "—"}
                    </p>
                  </section>
                ))}
              </div>
            </article>
          )}
        </div>
      )}
    </div>
  );
}
