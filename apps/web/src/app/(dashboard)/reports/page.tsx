import { FileText } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/stat-card";

export default function ReportsPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <DashboardHeader title="Relatórios" />
      <section
        aria-labelledby="reports-status-title"
        className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-card-foreground shadow-sm sm:p-12"
      >
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-sidebar-primary">
          <FileText aria-hidden="true" className="size-6" />
        </div>
        <h2 id="reports-status-title" className="text-lg font-semibold">
          Em produção
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Estamos preparando a próxima versão dos relatórios. A geração e a
          exportação de arquivos estão temporariamente pausadas nesta tela.
        </p>
      </section>
    </div>
  );
}
