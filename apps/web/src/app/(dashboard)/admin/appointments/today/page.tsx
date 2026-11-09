"use client";

import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/stat-card";
import {
  loadTodayAppointments,
  useDashboardResource,
} from "@/components/dashboard/dashboard-data";
import {
  dashboardActionClass,
  DashboardAppointmentList,
  DashboardEmpty,
  DashboardLoading,
  DashboardToolbar,
} from "@/components/dashboard/dashboard-ui";
import { calendarDateKey, calendarDayLabel } from "@/lib/calendar";

export default function AdminTodayAppointmentsPage() {
  const today = useDashboardResource(loadTodayAppointments);
  const day = calendarDayLabel(calendarDateKey(new Date()), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <DashboardHeader
        title="Consultas de hoje"
        subtitle={`${day}. Consulte os horários e a situação de cada atendimento.`}
      />
      <Link href="/admin/dashboard" className={dashboardActionClass}>
        Voltar ao painel
      </Link>
      <DashboardToolbar
        loading={today.loading}
        errors={[today.error]}
        onRefresh={today.refresh}
      />
      {today.loading ? (
        <DashboardLoading />
      ) : today.error ? null : today.data?.length ? (
        <section aria-label="Atendimentos de hoje" className="space-y-3">
          <p role="status" className="text-sm text-muted-foreground">
            {today.data.length} {today.data.length === 1 ? "consulta" : "consultas"}
          </p>
          <DashboardAppointmentList items={today.data} perspective="reception" />
        </section>
      ) : (
        <DashboardEmpty>Nenhuma consulta para hoje.</DashboardEmpty>
      )}
    </div>
  );
}
