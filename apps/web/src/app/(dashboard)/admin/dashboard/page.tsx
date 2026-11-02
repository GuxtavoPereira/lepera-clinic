"use client";

import { useCallback } from "react";
import {
  Activity,
  CalendarCheck,
  FileText,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import type { Role } from "@lepera/contracts";
import { DashboardHeader, StatCard } from "@/components/dashboard/stat-card";
import {
  dashboardDateTime,
  dashboardValue,
  loadTodayAppointments,
  useDashboardResource,
} from "@/components/dashboard/dashboard-data";
import {
  DashboardActions,
  DashboardAppointmentList,
  DashboardEmpty,
  DashboardLoading,
  DashboardSection,
  DashboardToolbar,
} from "@/components/dashboard/dashboard-ui";
import { apiFetch } from "@/lib/api-client";
import { useRole } from "@/lib/use-role";

type UserRow = { role: Role; isActive: boolean };
type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  actor: { name: string } | null;
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
  "user.profile_update": "Perfil atualizado",
};
const loadUsers = async (signal: AbortSignal) => {
  const users = await apiFetch<UserRow[]>("/users", { signal });
  const byRole: Partial<Record<Role, number>> = {};
  for (const user of users) byRole[user.role] = (byRole[user.role] ?? 0) + 1;
  return {
    total: users.length,
    active: users.filter((user) => user.isActive).length,
    byRole,
  };
};
const loadAudit = async (signal: AbortSignal) =>
  (
    await apiFetch<{ items: AuditEntry[] }>("/audit-logs?pageSize=8", {
      signal,
    })
  ).items;

export default function AdminDashboardPage() {
  const role = useRole();
  const users = useDashboardResource(loadUsers);
  const today = useDashboardResource(loadTodayAppointments);
  const audit = useDashboardResource(loadAudit);
  // The reception queues are intentionally not requested for ADMIN.
  const loadRequests = useCallback(
    async (signal: AbortSignal) =>
      role === "SUPER_ADMIN"
        ? (await apiFetch<unknown[]>("/schedule-requests/pending", { signal }))
            .length
        : null,
    [role],
  );
  const requests = useDashboardResource(loadRequests);
  const resources = [users, today, audit, requests];
  const superAdmin = role === "SUPER_ADMIN";
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <DashboardHeader
        title="Painel administrativo"
        subtitle="Visão da clínica, consultas do dia e atividade recente."
      />
      <DashboardToolbar
        loading={resources.some((item) => item.loading)}
        errors={resources.map((item) => item.error)}
        onRefresh={() => resources.forEach((item) => item.refresh())}
      />
      <DashboardActions
        actions={[
          {
            label: "Gerenciar usuários",
            href: "/admin/users",
            icon: Users,
            primary: true,
          },
          { label: "Meu perfil", href: "/profile", icon: ShieldCheck },
          ...(superAdmin
            ? [
                {
                  label: "Cadastrar paciente",
                  href: "/reception/patients?new=1",
                  icon: UserPlus,
                },
                {
                  label: "Agenda da clínica",
                  href: "/reception/calendar",
                  icon: CalendarCheck,
                },
              ]
            : []),
        ]}
      />
      <div
        className={`grid gap-4 sm:grid-cols-2 ${superAdmin ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}
      >
        <StatCard
          label="Usuários"
          value={dashboardValue(users, (data) => data.total)}
          icon={Users}
          href="/admin/users"
        />
        <StatCard
          label="Usuários ativos"
          value={dashboardValue(users, (data) => data.active)}
          icon={UserCheck}
          href="/admin/users"
        />
        <StatCard
          label="Consultas hoje"
          value={dashboardValue(today, (items) => items.length)}
          hint="Inclui atendimentos já realizados"
          icon={CalendarCheck}
          href={superAdmin ? "/reception/calendar" : undefined}
        />
        {superAdmin ? (
          <StatCard
            label="Solicitações de agendamento"
            value={requests.loading ? "…" : (requests.data ?? "—")}
            icon={FileText}
            href="/reception/requests"
            tone={requests.data ? "warning" : "default"}
          />
        ) : null}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardSection title="Por perfil">
          {users.loading ? (
            <DashboardLoading />
          ) : users.error ? (
            <DashboardEmpty>
              A lista de usuários está indisponível.
            </DashboardEmpty>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm text-card-foreground shadow-sm">
              {(Object.keys(ROLE_LABEL) as Role[])
                .filter((value) => (users.data?.byRole[value] ?? 0) > 0)
                .map((value) => (
                  <li
                    key={value}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <UserCog aria-hidden="true" className="size-4" />
                      {ROLE_LABEL[value]}
                    </span>
                    <span className="font-semibold">
                      {users.data?.byRole[value]}
                    </span>
                  </li>
                ))}
              {users.data?.total === 0 ? (
                <li className="p-4 text-muted-foreground">
                  Nenhum usuário encontrado.
                </li>
              ) : null}
            </ul>
          )}
        </DashboardSection>
        <div className="lg:col-span-2">
          <DashboardSection title="Atividade recente">
            {audit.loading ? (
              <DashboardLoading />
            ) : audit.error ? (
              <DashboardEmpty>
                A atividade recente está indisponível.
              </DashboardEmpty>
            ) : !audit.data?.length ? (
              <DashboardEmpty>
                Nenhuma atividade registrada ainda.
              </DashboardEmpty>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm text-card-foreground shadow-sm">
                {audit.data.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col justify-between gap-2 px-4 py-3 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        <Activity
                          aria-hidden="true"
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                        {ACTION_LABEL[entry.action] ?? "Atividade registrada"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.actor?.name ?? "Usuário removido"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {dashboardDateTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DashboardSection>
        </div>
      </div>
      <DashboardSection
        title="Consultas de hoje"
        description="Resumo da agenda no horário de Brasília, sem prontuários clínicos."
      >
        {today.loading ? (
          <DashboardLoading />
        ) : today.error ? (
          <DashboardEmpty>
            Não foi possível carregar as consultas de hoje.
          </DashboardEmpty>
        ) : !today.data?.length ? (
          <DashboardEmpty>Nenhuma consulta para hoje.</DashboardEmpty>
        ) : superAdmin ? (
          <DashboardAppointmentList
            items={today.data}
            perspective="reception"
            href="/reception/calendar"
          />
        ) : (
          <ul className="space-y-3">
            {today.data.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-border bg-card p-4 text-sm text-card-foreground"
              >
                <p className="font-medium">
                  {item.patient?.user.name ?? "Paciente"} com{" "}
                  {item.doctor?.user.name ?? "profissional"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {dashboardDateTime(item.startDatetime)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </div>
  );
}
