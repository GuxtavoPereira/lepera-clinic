import Link from "next/link";
import { HeartPulse } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container mx-auto max-w-screen-xl px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div>
            <div className="flex items-center gap-2 mb-4">
              <HeartPulse className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-primary">Leperapia Clinic</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Cuidando da sua saúde com excelência, tecnologia e atendimento humanizado.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Links Úteis</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-primary">Página Inicial</Link></li>
              <li><Link href="/sobre" className="hover:text-primary">Corpo Clínico</Link></li>
              <li><Link href="/login" className="hover:text-primary">Acesso Restrito</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-foreground">Contato</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Rua da Saúde, 123 - Centro</li>
              <li>(11) 99999-9999</li>
              <li>contato@leperapia.com.br</li>
            </ul>
          </div>

        </div>
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Leperapia Clinic. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}