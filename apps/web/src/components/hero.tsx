import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays } from "lucide-react";

export function Hero() {
  return (
    <section className="w-full py-20 md:py-32 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-8 flex flex-col items-center text-center">
        
        <div className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm mb-6">
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
          Agenda aberta para novos pacientes
        </div>
        
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl mb-6 leading-tight">
          Fim das filas. Sua saúde a <span className="text-primary">um clique de distância.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
          Cansado de esperas intermináveis ao telefone? Na Leperapia Clinic, unimos tecnologia e atendimento humanizado para que você agende suas consultas em minutos e tenha seu histórico médico sempre acessível.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto gap-2 text-md h-12 px-8">
            <CalendarDays className="h-5 w-5" />
            Agendar Agora
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 text-md h-12 px-8">
            Conhecer Especialidades
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

      </div>
    </section>
  );
}