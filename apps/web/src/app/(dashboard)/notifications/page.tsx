"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/forms/form-field";
import { NOTIFICATIONS_EVENT } from "@/components/notification-bell";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiFetch<Notification[]>("/notifications")
      .then((result) => {
        if (active) setItems(result);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar as notificações.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function markRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
      setItems((current) =>
        current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível marcar como lida.",
      );
    }
  }

  async function markAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível marcar como lidas.",
      );
    }
  }

  const unread = items.filter((item) => !item.isRead).length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <Bell className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Notificações
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {unread > 0
                ? `${unread} não lida${unread === 1 ? "" : "s"}`
                : "Tudo em dia."}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button type="button" variant="outline" onClick={() => void markAllRead()}>
            <CheckCheck className="size-4" />
            Marcar todas como lidas
          </Button>
        )}
      </header>

      {error && <Alert kind="error">{error}</Alert>}

      {loading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Você não tem notificações.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className={`rounded-2xl border p-5 shadow-sm ${
                item.isRead
                  ? "border-slate-200 bg-white"
                  : "border-teal-200 bg-teal-50/50"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.message}</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTimePtBr(item.createdAt)}
                  </p>
                </div>
                {!item.isRead && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void markRead(item.id)}
                  >
                    Marcar como lida
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
