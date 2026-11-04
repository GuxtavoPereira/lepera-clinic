import Link from "next/link";
import { HeartPulse } from "lucide-react";

const clinicLinks = [
  { href: "/#inicio", label: "Início" },
  { href: "/#atendimentos", label: "Atendimentos" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#sobre", label: "Sobre nós" },
  { href: "/#espaco", label: "Nosso espaço" },
  { href: "/#contato", label: "Contato" },
];

const footerLinkClass =
  "inline-flex min-h-9 items-center rounded-md transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:text-sidebar-primary";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr]">
          <div>
            <Link
              href="/#inicio"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg text-lg font-bold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-sidebar-primary"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <HeartPulse aria-hidden="true" className="size-5" />
              </span>
              Leperapia Clinic
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Um espaço de escuta e acolhimento. Conheça a equipe e encontre um
              tempo para você.
            </p>
          </div>

          <nav aria-label="Navegação do rodapé">
            <h2 className="mb-2 font-semibold text-foreground">Conheça a clínica</h2>
            <ul className="grid grid-cols-2 gap-x-3 text-sm text-muted-foreground">
              {clinicLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={footerLinkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h2 className="mb-2 font-semibold text-foreground">
              Contato e agendamento
            </h2>
            <ul className="text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:leperapiaoficial@gmail.com"
                  className={`${footerLinkClass} max-w-full break-all`}
                >
                  leperapiaoficial@gmail.com
                </a>
              </li>
              <li>
                <Link href="/explore/calendar" className={footerLinkClass}>
                  Horários disponíveis
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className={footerLinkClass}>
                  Portal do paciente
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Leperapia Clinic. Todos os direitos
          reservados.
        </div>
      </div>
    </footer>
  );
}
