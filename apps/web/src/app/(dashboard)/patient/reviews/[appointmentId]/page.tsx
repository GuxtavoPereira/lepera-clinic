"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, textareaClassName } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type ReviewPayload = {
  appointment: {
    id: string;
    startDatetime: string;
    durationMinutes: number;
    status: string;
    type: string;
    doctor: { name: string; specialty: string };
  };
  eligible: boolean;
  review: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  } | null;
};

const RATING_LABELS: Record<number, string> = {
  1: "Muito insatisfeito",
  2: "Insatisfeito",
  3: "Regular",
  4: "Satisfeito",
  5: "Muito satisfeito",
};

export default function ReviewAppointmentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();

  const [data, setData] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch<ReviewPayload>(`/reviews/appointment/${appointmentId}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) setData(res);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar a consulta para avaliação.",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appointmentId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !data?.eligible) return;
    setSaving(true);
    setError(null);
    try {
      const created = await apiFetch<{
        id: string;
        rating: number;
        comment: string | null;
        createdAt: string;
      }>(`/reviews/appointment/${appointmentId}`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          comment: comment.trim() || null,
        }),
      });
      setData((prev) =>
        prev ? { ...prev, eligible: false, review: created } : prev,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível registrar sua avaliação.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/patient/appointments"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar para Minhas consultas
      </Link>

      <header>
        <h1 className="text-2xl font-semibold text-foreground">
          Avaliar atendimento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compartilhe sua percepção sobre a consulta presencial realizada.
        </p>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-xs text-teal-950 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-100">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-700 dark:text-teal-400" />
        <p>
          Sua avaliação é interna e ajuda a clínica a aprimorar o atendimento.
          Comentários e sua identificação <strong>não são publicados</strong> no
          site público nem exportados nos relatórios agregados de satisfação.
        </p>
      </div>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <p
          role="status"
          className="flex items-center gap-2 py-8 text-sm text-muted-foreground"
        >
          <Loader2 className="size-4 animate-spin" />
          Carregando consulta...
        </p>
      ) : !data ? null : (
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="border-b border-border pb-4">
            <p className="font-semibold text-foreground">
              {data.appointment.doctor.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.appointment.doctor.specialty} ·{" "}
              {formatDateTimePtBr(data.appointment.startDatetime)}
            </p>
          </div>

          {data.review ? (
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-5 text-emerald-700 dark:text-emerald-400" />
                Avaliação registrada ({data.review.rating}/5 —{" "}
                {RATING_LABELS[data.review.rating] ?? ""})
              </p>
              <div className="flex gap-1" aria-label={`Nota ${data.review.rating} de 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`size-5 ${
                      n <= data.review!.rating
                        ? "fill-amber-400 text-amber-500"
                        : "text-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
              {data.review.comment && (
                <p className="whitespace-pre-wrap text-sm">
                  “{data.review.comment}”
                </p>
              )}
              <p className="text-xs opacity-80">
                Enviada em {formatDateTimePtBr(data.review.createdAt)}. Cada
                consulta pode ser avaliada uma única vez.
              </p>
            </div>
          ) : !data.eligible ? (
            <p className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Apenas consultas já realizadas podem receber avaliação.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-foreground">
                  Nota geral (1 a 5)
                </legend>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = rating === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        aria-label={`Nota ${value} — ${RATING_LABELS[value]}`}
                        onClick={() => setRating(value)}
                        className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm font-medium transition ${
                          selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-foreground hover:bg-accent"
                        }`}
                      >
                        <Star
                          className={`size-4 ${
                            value <= rating
                              ? "fill-amber-400 text-amber-500"
                              : "text-muted-foreground"
                          }`}
                        />
                        {value}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecionado: <strong>{RATING_LABELS[rating]}</strong>
                </p>
              </fieldset>

              <div className="space-y-1.5">
                <label
                  htmlFor="review-comment"
                  className="text-sm font-medium text-foreground"
                >
                  Comentário (opcional)
                </label>
                <textarea
                  id="review-comment"
                  rows={4}
                  maxLength={1000}
                  className={textareaClassName}
                  placeholder="Conte o que funcionou bem ou o que podemos melhorar no atendimento presencial."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" className="min-h-11" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  Enviar avaliação
                </Button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
