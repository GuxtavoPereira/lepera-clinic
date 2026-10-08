import Link from "next/link";
import { CalendarPlus, FlaskConical } from "lucide-react";

export default function AppointmentsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Agenda geral</h1>
        <p className="mt-1 text-sm text-slate-500">
          Use o formulário para enviar e validar um novo agendamento na API.
        </p>
      </div>

      <section className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
            <FlaskConical className="size-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Testar a rota de agendamentos
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
              Preencha os IDs do paciente e do profissional, escolha a data e
              envie a requisição autenticada para{" "}
              <code>POST /api/appointments</code>.
            </p>
          </div>
        </div>
        <Link
          href="/reception/appointments/new"
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <CalendarPlus className="size-4" />
          Abrir formulário
        </Link>
      </section>
    </div>
  );
}
