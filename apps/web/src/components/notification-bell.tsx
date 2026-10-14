"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

/** Disparado quando notificações são lidas, para o sino se atualizar. */
export const NOTIFICATIONS_EVENT = "lepera:notifications-changed";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const load = () => {
      void apiFetch<{ count: number }>("/notifications/unread-count")
        .then((result) => {
          if (active) setCount(result.count);
        })
        .catch(() => undefined);
    };

    load();
    const timer = window.setInterval(load, 60_000);
    window.addEventListener(NOTIFICATIONS_EVENT, load);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener(NOTIFICATIONS_EVENT, load);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      aria-label={
        count > 0 ? `Notificações (${count} não lidas)` : "Notificações"
      }
      className="relative rounded-md p-2 transition-colors hover:bg-slate-100 hover:text-slate-600"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
