"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { dashboardActionClass } from "@/components/dashboard/dashboard-ui";
import { Alert } from "@/components/forms/form-field";

export function NotificationAppointment({
  backHref,
  backLabel,
  error,
  children,
}: {
  backHref: string;
  backLabel: string;
  error: string | null;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href={backHref} className={dashboardActionClass}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        {backLabel}
      </Link>
      <h1
        ref={heading}
        tabIndex={-1}
        className="scroll-mt-24 text-2xl font-semibold"
      >
        Consulta da notificação
      </h1>
      {error && <Alert kind="error">{error}</Alert>}
      <ul>{children}</ul>
    </div>
  );
}

export function UnavailableNotificationAppointment() {
  return (
    <p
      role="status"
      className="rounded-xl border bg-card p-4 text-sm text-card-foreground"
    >
      A consulta desta notificação está indisponível.
    </p>
  );
}
