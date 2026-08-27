import { CalendarDays, ShieldCheck, Stethoscope } from "lucide-react";

export function Features() {
  return (
    <section className="w-full py-16">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border shadow-sm">
          <div className="p-3 bg-primary/10 rounded-full mb-4">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Corpo Clínico Especializado</h3>
          <p className="text-muted-foreground">Profissionais altamente qualificados e em constante atualização.</p>
        </div>

        <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border shadow-sm">
          <div className="p-3 bg-primary/10 rounded-full mb-4">
            <CalendarDays className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Agendamento Fácil</h3>
          <p className="text-muted-foreground">Marque suas consultas de forma rápida e 100% digital pelo nosso portal.</p>
        </div>

        <div className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border shadow-sm">
          <div className="p-3 bg-primary/10 rounded-full mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Estrutura Segura</h3>
          <p className="text-muted-foreground">Ambientes projetados para o seu conforto, seguindo rigorosos padrões de saúde.</p>
        </div>

      </div>
    </section>
  );
}