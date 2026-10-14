"use client";

import { useEffect, useState } from "react";
import { Activity, Calendar, UserCheck, UserCog, Users } from "lucide-react";
import type { Role } from "@lepera/contracts";
import {
  DashboardHeader,
  StatCard,
} from "@/components/dashboard/stat-card";
import { Alert } from "@/components/forms/form-field";
import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDateTimePtBr } from "@/lib/date-format";

type UserRow = { role: Role; isActive: boolean };

type AuditEntry = {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
  actor: { name: string; email: string } | null;
};

type Summary = {
  total: number;
  active: number;
  byRole: Partial<Record<Role, number>>;
  upcomingAppointments: number;
  audit: AuditEntry[];
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super administradores",
  ADMIN: "Administração",
  DOCTOR: "Profissionais",
  RECEPTIONIST: "Recepção",
  PATIENT: "Pacientes",
};

const ACTION_LABEL: Record<string, string> = {
  "clinical_record.create": "Prontuário criado",
  "clinical_record.update": "Prontuário alterado",
  "clinical_record.read": "Prontuário consultado",
  "clinical_record.sign": "Prontuário assinado",
  "cancellation_request.create": "Cancelamento solicitado",
  "cancellation_request.approve": "Cancelamento aprovado",
  "cancellation_request.reject": "Cancelamento recusado",
  "user.password_change": "Senha alterada",
};

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      apiFetch<UserRow[]>("/users"),
      apiFetch<{ total: number }>("/appointments?scope=upcoming&pageSize=1"),
      apiFetch<{ items: AuditEntry[] }>("/audit-logs?pageSize=8"),
    ])
      .then(([users, appointments, audit]) => {
        if (!active) return;
        const byRole: Partial<Record<Role, number>> = {};
        for (const user of users) {
          byRole[user.role] = (byRole[user.role] ?? 0) + 1;
        }
        setSummary({
          total: users.length,
          active: users.filter((user) => user.isActive).length,
          byRole,
          upcomingAppointments: appointments.total,
          audit: audit.items,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o painel.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <DashboardHeader
        title="Painel administrativo"
        subtitle="Visão geral da clínica e atividade recente."
      />

      {error && <Alert kind="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Usuários"
          value={summary?.total ?? "—"}
          icon={Users}
          href="/admin/users"
        />
        <StatCard
          label="Usuários ativos"
          value={summary?.active ?? "—"}
          icon={UserCheck}
          href="/admin/users"
        />
        <StatCard
          label="Consultas futuras"
          value={summary?.upcomingAppointments ?? "—"}
          icon={Calendar}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <UserCog className="size-5 text-slate-400" />
            Por perfil
          </h2>
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
            {(Object.keys(ROLE_LABEL) as Role[])
              .filter((role) => (summary?.byRole[role] ?? 0) > 0)
              .map((role) => (
                <li key={role} className="flex justify-between px-4 py-3">
                  <span className="text-slate-600">{ROLE_LABEL[role]}</span>
                  <span className="font-semibold text-slate-900">
                    {summary?.byRole[role]}
                  </span>
                </li>
              ))}
            {!summary && (
              <li className="px-4 py-3 text-slate-400">Carregando...</li>
            )}
          </ul>
        </section>

        <section className="space-y-3 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Activity className="size-5 text-slate-400" />
            Atividade recente
          </h2>
          {!summary ? (
            <p className="text-sm text-slate-400">Carregando...</p>
          ) : summary.audit.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              Nenhuma atividade registrada ainda.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm">
              {summary.audit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-col justify-between gap-1 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.actor?.name ?? "Usuário removido"}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {formatDateTimePtBr(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
