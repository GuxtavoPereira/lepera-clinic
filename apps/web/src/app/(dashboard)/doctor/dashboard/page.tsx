"use client";

import {
  Ban,
  Calendar,
  CalendarCheck,
  ClipboardList,
  Users,
} from "lucide-react";
import { DashboardHeader, StatCard } from "@/components/dashboard/stat-card";
import {
  dashboardValue,
  loadOwnAppointments,
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
import { useCurrentUser } from "@/lib/use-current-user";

const loadUnsigned = async (signal: AbortSignal) =>
  (
    await apiFetch<Array<{ isSigned: boolean }>>("/clinical-records/mine", {
      signal,
    })
  ).filter((item) => !item.isSigned).length;
const loadPending = async (signal: AbortSignal) =>
  (
    await apiFetch<Array<{ status: string }>>("/cancellation-requests/mine", {
      signal,
    })
  ).filter((item) => item.status === "PENDING").length;

export default function DoctorDashboardPage() {
  const user = useCurrentUser();
  const today = useDashboardResource(loadTodayAppointments);
  const appointments = useDashboardResource(loadOwnAppointments);
  const unsigned = useDashboardResource(loadUnsigned);
  const cancellations = useDashboardResource(loadPending);
  const resources = [today, appointments, unsigned, cancellations];
  const firstName = user?.name.split(" ")[0];
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <DashboardHeader
        title={firstName ? `Olá, ${firstName}` : "Seu dia na clínica"}
        subtitle="Sua agenda e as pendências dos seus atendimentos."
      />
      <DashboardToolbar
        loading={resources.some((item) => item.loading)}
        errors={resources.map((item) => item.error)}
        onRefresh={() => resources.forEach((item) => item.refresh())}
      />
      <DashboardActions
        actions={[
          {
            label: "Abrir minha agenda",
            href: "/doctor/calendar",
            icon: Calendar,
            primary: true,
          },
          { label: "Meus pacientes", href: "/doctor/patients", icon: Users },
          {
            label: "Prontuários",
            href: "/doctor/records",
            icon: ClipboardList,
          },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Consultas hoje"
          value={dashboardValue(today, (items) => items.length)}
          hint="Inclui atendimentos já realizados"
          icon={CalendarCheck}
          href="/doctor/calendar"
        />
        <StatCard
          label="Próximas consultas"
          value={dashboardValue(appointments, (data) => data.next.length)}
          hint="Inclui atendimento em andamento"
          icon={Calendar}
          href="/doctor/calendar"
        />
        <StatCard
          label="Aguardando assinatura"
          value={dashboardValue(unsigned, (count) => count)}
          icon={ClipboardList}
          href="/doctor/records"
          tone={unsigned.data ? "warning" : "default"}
        />
        <StatCard
          label="Cancelamentos solicitados"
          value={dashboardValue(cancellations, (count) => count)}
          hint="Aguardando a recepção"
          icon={Ban}
          href="/doctor/calendar"
          tone={cancellations.data ? "warning" : "default"}
        />
      </div>
      <DashboardSection
        title="Atendimentos de hoje"
        description="Horários em ordem cronológica, incluindo os atendimentos já realizados."
      >
        {today.loading ? (
          <DashboardLoading />
        ) : today.error ? (
          <DashboardEmpty>
            Não foi possível carregar a agenda do dia.
          </DashboardEmpty>
        ) : !today.data?.length ? (
          <DashboardEmpty>
            Nenhuma consulta para hoje. Abra a agenda para consultar as próximas
            datas.
          </DashboardEmpty>
        ) : (
          <DashboardAppointmentList
            items={today.data}
            perspective="doctor"
            href={(item) => `/doctor/session/${item.id}`}
          />
        )}
      </DashboardSection>
    </div>
  );
}
