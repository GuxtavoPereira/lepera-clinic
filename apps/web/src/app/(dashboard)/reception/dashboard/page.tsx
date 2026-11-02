"use client";

import {
  Ban,
  CalendarCheck,
  CalendarPlus,
  FileText,
  UserPlus,
  Users,
} from "lucide-react";
import { DashboardHeader, StatCard } from "@/components/dashboard/stat-card";
import {
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

const loadRequests = (signal: AbortSignal) =>
  apiFetch<unknown[]>("/schedule-requests/pending", { signal });
const loadCancellations = (signal: AbortSignal) =>
  apiFetch<unknown[]>("/cancellation-requests/pending", { signal });
const loadPatients = (signal: AbortSignal) =>
  apiFetch<{ total: number }>("/patients?pageSize=1", { signal });

export default function ReceptionDashboardPage() {
  const today = useDashboardResource(loadTodayAppointments);
  const requests = useDashboardResource(loadRequests);
  const cancellations = useDashboardResource(loadCancellations);
  const patients = useDashboardResource(loadPatients);
  const resources = [today, requests, cancellations, patients];
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <DashboardHeader
        title="Recepção"
        subtitle="Atendimentos de hoje, solicitações e ações para organizar a clínica."
      />
      <DashboardToolbar
        loading={resources.some((item) => item.loading)}
        errors={resources.map((item) => item.error)}
        onRefresh={() => resources.forEach((item) => item.refresh())}
      />
      <DashboardActions
        actions={[
          {
            label: "Cadastrar paciente",
            href: "/reception/patients?new=1",
            icon: UserPlus,
            primary: true,
          },
          {
            label: "Novo agendamento",
            href: "/reception/appointments/new",
            icon: CalendarPlus,
          },
          {
            label: "Ver calendário",
            href: "/reception/calendar",
            icon: CalendarCheck,
          },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Consultas hoje"
          value={dashboardValue(today, (items) => items.length)}
          hint="Inclui atendimentos já realizados"
          icon={CalendarCheck}
          href="/reception/calendar"
        />
        <StatCard
          label="Solicitações de agendamento"
          value={dashboardValue(requests, (items) => items.length)}
          hint="Aguardando análise"
          icon={FileText}
          href="/reception/requests"
          tone={requests.data?.length ? "warning" : "default"}
        />
        <StatCard
          label="Pedidos de cancelamento"
          value={dashboardValue(cancellations, (items) => items.length)}
          hint="Solicitações dos profissionais"
          icon={Ban}
          href="/reception/appointments"
          tone={cancellations.data?.length ? "warning" : "default"}
        />
        <StatCard
          label="Pacientes cadastrados"
          value={dashboardValue(patients, (data) => data.total)}
          icon={Users}
          href="/reception/patients"
        />
      </div>
      <DashboardSection
        title="Agenda de hoje"
        description="Todos os horários do dia, inclusive os que já passaram. Canceladas e remarcadas não entram nesta lista."
      >
        {today.loading ? (
          <DashboardLoading />
        ) : today.error ? (
          <DashboardEmpty>
            A agenda está indisponível. Os outros atalhos continuam disponíveis.
          </DashboardEmpty>
        ) : !today.data?.length ? (
          <DashboardEmpty>
            Nenhuma consulta para hoje. Você pode consultar outras datas no
            calendário ou criar um agendamento.
          </DashboardEmpty>
        ) : (
          <DashboardAppointmentList
            items={today.data}
            perspective="reception"
            href="/reception/calendar"
          />
        )}
      </DashboardSection>
    </div>
  );
}
