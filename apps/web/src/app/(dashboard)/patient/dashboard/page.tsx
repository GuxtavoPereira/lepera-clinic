"use client";

import Link from "next/link";
import {
  Calendar,
  CalendarCheck,
  CalendarPlus,
  FileText,
  User,
} from "lucide-react";
import { DashboardHeader, StatCard } from "@/components/dashboard/stat-card";
import {
  appointmentDuration,
  dashboardDateTime,
  dashboardValue,
  loadOwnAppointments,
  loadTodayAppointments,
  useDashboardResource,
} from "@/components/dashboard/dashboard-data";
import {
  dashboardActionClass,
  DashboardActions,
  DashboardAppointmentList,
  DashboardEmpty,
  DashboardLoading,
  DashboardSection,
  DashboardToolbar,
} from "@/components/dashboard/dashboard-ui";
import { apiFetch } from "@/lib/api-client";
import { useCurrentUser } from "@/lib/use-current-user";

const loadPending = async (signal: AbortSignal) =>
  (
    await apiFetch<Array<{ status: string }>>("/schedule-requests/mine", {
      signal,
    })
  ).filter((item) => item.status === "PENDING").length;

export default function PatientDashboardPage() {
  const user = useCurrentUser();
  const today = useDashboardResource(loadTodayAppointments);
  const appointments = useDashboardResource(loadOwnAppointments);
  const requests = useDashboardResource(loadPending);
  const resources = [today, appointments, requests];
  const next = appointments.data?.next[0];
  const firstName = user?.name.split(" ")[0];
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <DashboardHeader
        title={firstName ? `Olá, ${firstName}` : "Meu acompanhamento"}
        subtitle="Suas consultas, solicitações e horários disponíveis em um só lugar."
      />
      <DashboardToolbar
        loading={resources.some((item) => item.loading)}
        errors={resources.map((item) => item.error)}
        onRefresh={() => resources.forEach((item) => item.refresh())}
      />
      <DashboardActions
        actions={[
          {
            label: "Solicitar atendimento",
            href: "/patient/request-appointment",
            icon: CalendarPlus,
            primary: true,
          },
          {
            label: "Ver calendário e horários livres",
            href: "/patient/calendar",
            icon: Calendar,
          },
          { label: "Meu perfil", href: "/patient/profile", icon: User },
        ]}
      />
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold">Sua próxima consulta</h2>
        {appointments.loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Carregando…
          </p>
        ) : appointments.error ? (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar sua próxima consulta. Atualize o painel
            para tentar novamente.
          </p>
        ) : next ? (
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-1">
              <p className="text-xl font-semibold text-foreground">
                {dashboardDateTime(next.startDatetime)}
              </p>
              <p className="text-sm text-muted-foreground">
                Com {next.doctor?.user.name ?? "seu profissional"}
              </p>
              <p className="text-sm text-muted-foreground">
                {appointmentDuration(next)} minutos ·{" "}
                {next.modality === "ONLINE" ? "Online" : "Presencial"}
              </p>
            </div>
            <Link href="/patient/appointments" className={dashboardActionClass}>
              Ver detalhes ou cancelar
            </Link>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você não tem consultas marcadas. Consulte os horários livres no
            calendário e solicite um atendimento.
          </p>
        )}
      </section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Consultas hoje"
          value={dashboardValue(today, (items) => items.length)}
          icon={CalendarCheck}
          href="/patient/calendar"
        />
        <StatCard
          label="Próximas consultas"
          value={dashboardValue(appointments, (data) => data.next.length)}
          icon={Calendar}
          href="/patient/appointments"
        />
        <StatCard
          label="Realizadas"
          value={dashboardValue(
            appointments,
            (data) =>
              data.items.filter((item) => item.status === "COMPLETED").length,
          )}
          icon={CalendarCheck}
          href="/patient/appointments"
        />
        <StatCard
          label="Solicitações em análise"
          value={dashboardValue(requests, (count) => count)}
          icon={FileText}
          href="/patient/appointments"
          tone={requests.data ? "warning" : "default"}
        />
      </div>
      <DashboardSection
        title="Hoje"
        description="Somente as suas consultas, no horário de Brasília."
      >
        {today.loading ? (
          <DashboardLoading />
        ) : today.error ? (
          <DashboardEmpty>
            Não foi possível carregar suas consultas de hoje.
          </DashboardEmpty>
        ) : !today.data?.length ? (
          <DashboardEmpty>
            Você não tem consultas hoje. Seus próximos agendamentos continuam
            disponíveis em “Minhas consultas”.
          </DashboardEmpty>
        ) : (
          <DashboardAppointmentList
            items={today.data}
            perspective="patient"
            href="/patient/appointments"
          />
        )}
      </DashboardSection>
    </div>
  );
}
