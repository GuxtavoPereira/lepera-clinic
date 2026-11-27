"use client";

import { useEffect, useState } from "react";
import { Check, CheckCheck, MessageSquareText } from "lucide-react";
import {
  guidanceMessageCategoryLabels,
  type GuidanceMessageCategory,
} from "@lepera/contracts";
import { Alert } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type ReceivedMessage = {
  id: string;
  category: GuidanceMessageCategory;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  doctor: { name: string; specialty: string };
};

export default function PatientMessagesPage() {
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<{ items: ReceivedMessage[]; unreadCount: number }>(
      "/guidance-messages/mine",
    )
      .then((res) => {
        if (active) {
          setMessages(res.items);
          setUnreadCount(res.unreadCount);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof ApiError
            ? cause.message
            : "Não foi possível carregar suas orientações.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function markAsRead(id: string) {
    setMarkingId(id);
    try {
      const updated = await apiFetch<{ id: string; readAt: string }>(
        `/guidance-messages/${id}/read`,
        { method: "PATCH" },
      );
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, readAt: updated.readAt } : m)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível marcar a mensagem como lida.",
      );
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageSquareText className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Orientações dos profissionais
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Mensagens pós-consulta, preparações e comunicados enviados pela
              equipe que acompanha você.
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
          </span>
        )}
      </header>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando orientações…
        </p>
      ) : messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Você ainda não recebeu orientações dos seus profissionais.
        </div>
      ) : (
        <ul className="space-y-3">
          {messages.map((msg) => (
            <li
              key={msg.id}
              className={`space-y-3 rounded-2xl border p-5 shadow-sm ${
                msg.readAt
                  ? "border-border bg-card"
                  : "border-primary/40 bg-primary/5"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {guidanceMessageCategoryLabels[msg.category]}
                    </span>
                    <h2 className="font-semibold text-foreground">
                      {msg.subject}
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {msg.doctor.name} ({msg.doctor.specialty}) ·{" "}
                    {formatDateTimePtBr(msg.createdAt)}
                  </p>
                </div>
                {msg.readAt ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <CheckCheck className="size-3.5 text-primary" />
                    Lida
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={markingId === msg.id}
                    onClick={() => void markAsRead(msg.id)}
                  >
                    <Check className="size-4" />
                    Marcar como lida
                  </Button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                {msg.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
