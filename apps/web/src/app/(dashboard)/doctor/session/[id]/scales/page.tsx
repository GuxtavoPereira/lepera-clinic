"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Loader2,
  Lock,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, inputClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type ScaleRow = {
  id: string;
  name: string;
  value: number;
  observation: string;
};

type ScalesResponse = {
  appointment: {
    id: string;
    startDatetime: string;
    durationMinutes: number;
    status: string;
    patient: { id: string; name: string };
  };
  recordId: string | null;
  isSigned: boolean;
  signedAt: string | null;
  sessionSequence: number | null;
  scales: Array<{
    id: string;
    name: string;
    value: number;
    observation: string | null;
  }>;
};

const SUGGESTED_SCALES = [
  "Humor",
  "Ansiedade",
  "Qualidade do sono",
  "Nível de estresse",
  "Energia / disposição",
  "Adesão às tarefas",
];

export default function SessionScalesPage() {
  const { id: appointmentId } = useParams<{ id: string }>();

  const [data, setData] = useState<ScalesResponse | null>(null);
  const [rows, setRows] = useState<ScaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<ScalesResponse>(
      `/clinical-records/by-appointment/${appointmentId}/scales`,
      { signal: controller.signal },
    )
      .then((res) => {
        if (controller.signal.aborted) return;
        setData(res);
        setRows(
          res.scales.map((s) => ({
            id: s.id,
            name: s.name,
            value: s.value,
            observation: s.observation ?? "",
          })),
        );
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar as escalas da sessão.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appointmentId]);

  const signed = data?.isSigned ?? false;

  function addScale(defaultName = "") {
    if (signed || rows.length >= 20) return;
    setNotice(null);
    setRows((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: defaultName,
        value: 5,
        observation: "",
      },
    ]);
  }

  function updateRow(idx: number, patch: Partial<ScaleRow>) {
    setNotice(null);
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(idx: number) {
    setNotice(null);
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (signed || saving) return;
    setError(null);
    setNotice(null);

    for (const row of rows) {
      if (row.name.trim().length < 2) {
        setError("Informe um nome (mínimo 2 caracteres) para todas as escalas.");
        return;
      }
      if (!Number.isInteger(row.value) || row.value < 1 || row.value > 10) {
        setError("Cada escala deve ter valor inteiro entre 1 e 10.");
        return;
      }
    }

    setSaving(true);
    try {
      const saved = await apiFetch<ScalesResponse>(
        `/clinical-records/by-appointment/${appointmentId}/scales`,
        {
          method: "PUT",
          body: JSON.stringify({
            scales: rows.map((r) => ({
              name: r.name.trim(),
              value: r.value,
              observation: r.observation.trim() || null,
            })),
          }),
        },
      );
      setData(saved);
      setRows(
        saved.scales.map((s) => ({
          id: s.id,
          name: s.name,
          value: s.value,
          observation: s.observation ?? "",
        })),
      );
      setNotice("Escalas da sessão salvas com observações cifradas.");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar as escalas.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" />
        Carregando escalas...
      </p>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href={`/doctor/session/${appointmentId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar ao prontuário
        </Link>
        <Alert kind="error">{error ?? "Sessão não encontrada."}</Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/doctor/session/${appointmentId}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao prontuário da sessão
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-foreground">
            <Activity className="size-6 text-primary" />
            Escalas de acompanhamento — {data.appointment.patient.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTimePtBr(data.appointment.startDatetime)}
            {data.sessionSequence ? ` · Sessão ${data.sessionSequence}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            signed
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
          }`}
        >
          {signed && <Lock className="size-3" />}
          {signed ? "Prontuário assinado (somente leitura)" : "Editável"}
        </span>
      </header>

      <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
        Escalas numéricas de acompanhamento de sessão (1 a 10). As observações
        são armazenadas cifradas e auditadas. Este recurso apoia o registro
        longitudinal do psicólogo e <strong>não gera diagnóstico automático</strong>.
      </p>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
        >
          {notice}
        </p>
      )}

      {!signed && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Adicionar escala rápida:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SCALES.map((label) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addScale(label)}
              >
                <Plus className="size-3.5" />
                {label}
              </Button>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addScale("")}
            >
              <Plus className="size-3.5" />
              Escala personalizada
            </Button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma escala registrada nesta sessão.
            {!signed && " Use os botões acima para adicionar uma escala."}
          </p>
        ) : (
          <ul className="space-y-4">
            {rows.map((row, idx) => (
              <li
                key={row.id}
                className="space-y-3 rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-48 flex-1">
                    <label
                      htmlFor={`scale-name-${idx}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Nome da escala
                    </label>
                    <input
                      id={`scale-name-${idx}`}
                      required
                      maxLength={80}
                      disabled={signed}
                      className={`${inputClassName} mt-1`}
                      placeholder="Ex.: Humor, Ansiedade..."
                      value={row.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                    />
                  </div>
                  <div className="w-40">
                    <label
                      htmlFor={`scale-value-${idx}`}
                      className="flex items-center justify-between text-xs font-medium text-muted-foreground"
                    >
                      <span>Intensidade (1–10)</span>
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 font-bold text-primary">
                        {row.value}
                      </span>
                    </label>
                    <input
                      id={`scale-value-${idx}`}
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      disabled={signed}
                      className="mt-2.5 w-full accent-primary"
                      value={row.value}
                      onChange={(e) =>
                        updateRow(idx, { value: Number(e.target.value) })
                      }
                    />
                  </div>
                  {!signed && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover escala ${row.name || idx + 1}`}
                      className="mt-4 text-destructive hover:text-destructive"
                      onClick={() => removeRow(idx)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <div>
                  <label
                    htmlFor={`scale-obs-${idx}`}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Observação clínica (opcional, armazenada cifrada)
                  </label>
                  <input
                    id={`scale-obs-${idx}`}
                    maxLength={500}
                    disabled={signed}
                    className={`${inputClassName} mt-1`}
                    placeholder="Contexto ou relato breve desta medição"
                    value={row.observation}
                    onChange={(e) =>
                      updateRow(idx, { observation: e.target.value })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!signed && (
          <div className="flex justify-end border-t border-border pt-4">
            <Button type="submit" className="min-h-11" disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvar escalas
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
