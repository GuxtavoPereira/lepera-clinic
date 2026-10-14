"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Loader2, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type AppointmentSummary = {
  id: string;
  startDatetime: string;
  durationMinutes: number;
  status: string;
  sessionSequence: number | null;
  patient: { id: string; name: string };
};

type RecordResponse = {
  id: string;
  isSigned: boolean;
  signedAt: string | null;
  sessionSequence: number;
  mainComplaint: string | null;
  clinicalNotes: string | null;
  homework: string | null;
  diagnosticHypothesis: string | null;
  cid10: string | null;
  dsm5: string | null;
  approachUsed: string | null;
  therapeuticPlan: string | null;
  nextSessionDate: string | null;
  nextSessionRoom: string | null;
};

type SessionData = {
  appointment: AppointmentSummary;
  record: RecordResponse | null;
};

type FormState = {
  mainComplaint: string;
  clinicalNotes: string;
  homework: string;
  diagnosticHypothesis: string;
  cid10: string;
  dsm5: string;
  approachUsed: string;
  therapeuticPlan: string;
  nextSessionDate: string;
  nextSessionRoom: string;
};

const EMPTY_FORM: FormState = {
  mainComplaint: "",
  clinicalNotes: "",
  homework: "",
  diagnosticHypothesis: "",
  cid10: "",
  dsm5: "",
  approachUsed: "",
  therapeuticPlan: "",
  nextSessionDate: "",
  nextSessionRoom: "",
};

function toForm(record: RecordResponse | null): FormState {
  if (!record) return EMPTY_FORM;
  return {
    mainComplaint: record.mainComplaint ?? "",
    clinicalNotes: record.clinicalNotes ?? "",
    homework: record.homework ?? "",
    diagnosticHypothesis: record.diagnosticHypothesis ?? "",
    cid10: record.cid10 ?? "",
    dsm5: record.dsm5 ?? "",
    approachUsed: record.approachUsed ?? "",
    therapeuticPlan: record.therapeuticPlan ?? "",
    nextSessionDate: record.nextSessionDate?.slice(0, 10) ?? "",
    nextSessionRoom: record.nextSessionRoom ?? "",
  };
}

const inputClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 disabled:bg-slate-50 disabled:text-slate-600";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SessionPage() {
  const params = useParams<{ id: string }>();
  const appointmentId = params.id;

  const [data, setData] = useState<SessionData | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingSign, setConfirmingSign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<SessionData>(
      `/clinical-records/by-appointment/${appointmentId}`,
    )
      .then((result) => {
        if (!active) return;
        setData(result);
        setForm(toForm(result.record));
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o prontuário.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appointmentId]);

  const signed = data?.record?.isSigned ?? false;

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice(null);
  }

  async function saveDraft() {
    // Texto vazio vira null (apaga o campo); a API cifra o restante.
    const body = Object.fromEntries(
      Object.entries(form).map(([key, value]) => [
        key,
        value.trim() === "" ? null : value,
      ]),
    );
    const result = await apiFetch<SessionData>(
      `/clinical-records/by-appointment/${appointmentId}`,
      { method: "PUT", body: JSON.stringify(body) },
    );
    setData(result);
    setForm(toForm(result.record));
    return result;
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveDraft();
      setNotice("Rascunho salvo.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
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
      const result = await apiFetch<SessionData>(
        `/clinical-records/by-appointment/${appointmentId}/sign`,
        { method: "POST" },
      );
      setData(result);
      setForm(toForm(result.record));
      setConfirmingSign(false);
      setNotice("Prontuário assinado. Ele não pode mais ser alterado.");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível assinar.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Carregando prontuário...</p>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link
          href="/doctor/calendar"
          className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar para a agenda
        </Link>
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error ?? "Consulta não encontrada."}
        </p>
      </div>
    );
  }

  const { appointment } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/doctor/records"
          className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="size-4" />
          Voltar para os prontuários
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {appointment.patient.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateTimePtBr(appointment.startDatetime)} ·{" "}
              {appointment.durationMinutes} minutos
              {data.record && ` · Sessão ${data.record.sessionSequence}`}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              signed
                ? "bg-emerald-50 text-emerald-800"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            {signed && <Lock className="size-3" />}
            {signed ? "Assinado" : "Rascunho"}
          </span>
        </div>
      </div>

      <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        O conteúdo é gravado criptografado e todo acesso a este prontuário fica
        registrado na auditoria. Depois de assinado, não é possível alterá-lo.
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      <form
        onSubmit={(event) => event.preventDefault()}
        className="space-y-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Registro da sessão
          </h2>
          <Field id="mainComplaint" label="Queixa principal / tema da sessão">
            <textarea
              id="mainComplaint"
              className={`${inputClassName} h-24 resize-y`}
              value={form.mainComplaint}
              onChange={(e) => update("mainComplaint", e.target.value)}
              disabled={signed}
            />
          </Field>
          <Field id="clinicalNotes" label="Observações e evolução clínica *">
            <textarea
              id="clinicalNotes"
              className={`${inputClassName} h-40 resize-y`}
              value={form.clinicalNotes}
              onChange={(e) => update("clinicalNotes", e.target.value)}
              disabled={signed}
            />
          </Field>
          <Field id="homework" label="Tarefas e orientações para casa">
            <textarea
              id="homework"
              className={`${inputClassName} h-24 resize-y`}
              value={form.homework}
              onChange={(e) => update("homework", e.target.value)}
              disabled={signed}
            />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Hipótese diagnóstica e plano terapêutico
          </h2>
          <Field id="diagnosticHypothesis" label="Hipótese diagnóstica">
            <input
              id="diagnosticHypothesis"
              className={inputClassName}
              value={form.diagnosticHypothesis}
              onChange={(e) => update("diagnosticHypothesis", e.target.value)}
              disabled={signed}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cid10" label="CID-10">
              <input
                id="cid10"
                className={inputClassName}
                value={form.cid10}
                onChange={(e) => update("cid10", e.target.value)}
                disabled={signed}
              />
            </Field>
            <Field id="dsm5" label="DSM-5">
              <input
                id="dsm5"
                className={inputClassName}
                value={form.dsm5}
                onChange={(e) => update("dsm5", e.target.value)}
                disabled={signed}
              />
            </Field>
          </div>
          <Field id="approachUsed" label="Abordagem utilizada">
            <input
              id="approachUsed"
              className={inputClassName}
              value={form.approachUsed}
              onChange={(e) => update("approachUsed", e.target.value)}
              disabled={signed}
            />
          </Field>
          <Field id="therapeuticPlan" label="Plano terapêutico / próximos passos">
            <textarea
              id="therapeuticPlan"
              className={`${inputClassName} h-24 resize-y`}
              value={form.therapeuticPlan}
              onChange={(e) => update("therapeuticPlan", e.target.value)}
              disabled={signed}
            />
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Próxima sessão
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="nextSessionDate" label="Data">
              <input
                id="nextSessionDate"
                type="date"
                lang="pt-BR"
                className={inputClassName}
                value={form.nextSessionDate}
                onChange={(e) => update("nextSessionDate", e.target.value)}
                disabled={signed}
              />
            </Field>
            <Field id="nextSessionRoom" label="Sala">
              <input
                id="nextSessionRoom"
                className={inputClassName}
                value={form.nextSessionRoom}
                onChange={(e) => update("nextSessionRoom", e.target.value)}
                disabled={signed}
              />
            </Field>
          </div>
        </section>

        {!signed && (
          <div className="space-y-3 border-t border-slate-100 pt-5">
            {confirmingSign ? (
              <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-900">
                  Assinar e finalizar? Depois disso o prontuário não poderá ser
                  alterado e a consulta será marcada como realizada.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setConfirmingSign(false)}
                    disabled={saving}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleSign()}
                    disabled={saving}
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
                  onClick={() => void handleSave()}
                  disabled={saving}
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
                  onClick={() => setConfirmingSign(true)}
                  disabled={saving || form.clinicalNotes.trim() === ""}
                >
                  <Lock className="size-4" />
                  Assinar e finalizar
                </Button>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
