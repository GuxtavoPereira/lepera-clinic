"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCheck,
  Clock3,
  Loader2,
  MessageSquareText,
  Send,
} from "lucide-react";
import {
  guidanceMessageCategories,
  guidanceMessageCategoryLabels,
  type GuidanceMessageCategory,
} from "@lepera/contracts";
import { DashboardLoading } from "@/components/dashboard/dashboard-ui";
import {
  Alert,
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type SentMessage = {
  id: string;
  patientId: string;
  category: GuidanceMessageCategory;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  patient: { id: string; name: string };
};

type PatientOption = {
  id: string;
  user: { name: string };
};

export default function DoctorMessagesPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DoctorMessagesWorkspace />
    </Suspense>
  );
}

function DoctorMessagesWorkspace() {
  const initialPatientId = useSearchParams().get("patientId") ?? "";
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [messages, setMessages] = useState<SentMessage[]>([]);
  const [filterPatientId, setFilterPatientId] = useState(initialPatientId);
  const [loading, setLoading] = useState(true);

  const [patientId, setPatientId] = useState(initialPatientId);
  const [category, setCategory] =
    useState<GuidanceMessageCategory>("POST_SESSION");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    void apiFetch<{ items: PatientOption[] }>(
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
    const qs = filterPatientId
      ? `?patientId=${encodeURIComponent(filterPatientId)}`
      : "";
    void apiFetch<{ items: SentMessage[] }>(`/guidance-messages/sent${qs}`)
      .then((res) => {
        if (active) {
          setMessages(res.items);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível carregar as orientações enviadas.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filterPatientId, reloadKey]);

  async function handleSend(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    if (!patientId) {
      setError("Selecione o paciente vinculado.");
      return;
    }
    if (subject.trim().length < 3) {
      setError("Informe um assunto com pelo menos 3 caracteres.");
      return;
    }
    if (body.trim().length < 5) {
      setError("Escreva a orientação com pelo menos 5 caracteres.");
      return;
    }

    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch("/guidance-messages", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          category,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      setSubject("");
      setBody("");
      setNotice(
        "Orientação enviada com segurança. O paciente recebeu um aviso em sua conta.",
      );
      setReloadKey((k) => k + 1);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível enviar a orientação.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MessageSquareText className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Orientações ao paciente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie orientações pós-consulta, preparações ou avisos de desmarcação
            aos seus pacientes vinculados.
          </p>
        </div>
      </header>

      <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-foreground">
        <strong>Importante:</strong> enviar um aviso de desmarcação não altera
        nem cancela o horário da consulta automaticamente. Para cancelar ou
        remarcar uma sessão, utilize a agenda.
      </p>

      {error && <Alert kind="error">{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}

      <form
        onSubmit={(event) => void handleSend(event)}
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 className="text-base font-semibold text-foreground">
          Nova mensagem de orientação
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="guidance-patient" label="Paciente vinculado *">
            <select
              id="guidance-patient"
              className={inputClassName}
              value={patientId}
              disabled={sending}
              onChange={(e) => setPatientId(e.target.value)}
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
          <FormField id="guidance-category" label="Tipo de mensagem *">
            <select
              id="guidance-category"
              className={inputClassName}
              value={category}
              disabled={sending}
              onChange={(e) =>
                setCategory(e.target.value as GuidanceMessageCategory)
              }
            >
              {guidanceMessageCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {guidanceMessageCategoryLabels[cat]}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <FormField id="guidance-subject" label="Assunto *">
          <input
            id="guidance-subject"
            className={inputClassName}
            maxLength={160}
            value={subject}
            disabled={sending}
            placeholder="Ex.: Orientações após nossa sessão de hoje"
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </FormField>
        <FormField id="guidance-body" label="Mensagem *">
          <textarea
            id="guidance-body"
            className={`${textareaClassName} min-h-32 resize-y`}
            maxLength={5000}
            value={body}
            disabled={sending}
            placeholder="Escreva as orientações ou informações ao paciente..."
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </FormField>
        <div className="flex justify-end">
          <Button type="submit" disabled={sending} className="min-h-11">
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            Enviar orientação
          </Button>
        </div>
      </form>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            Histórico enviado
          </h2>
          <div className="w-full sm:w-64">
            <FormField id="guidance-filter-patient" label="Filtrar por paciente">
              <select
                id="guidance-filter-patient"
                className={inputClassName}
                value={filterPatientId}
                onChange={(e) => {
                  setLoading(true);
                  setFilterPatientId(e.target.value);
                }}
              >
                <option value="">Todos os pacientes</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
        </div>

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando histórico…
          </p>
        ) : messages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            Nenhuma orientação enviada ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {guidanceMessageCategoryLabels[msg.category]}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {msg.subject}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {msg.readAt ? (
                      <>
                        <CheckCheck className="size-3.5 text-primary" />
                        Lida em {formatDateTimePtBr(msg.readAt)}
                      </>
                    ) : (
                      <>
                        <Clock3 className="size-3.5" />
                        Não lida
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Para <strong className="text-foreground">{msg.patient.name}</strong> ·{" "}
                  {formatDateTimePtBr(msg.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                  {msg.body}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
