import Link from "next/link";
import {
  ArrowRight,
  Baby,
  HeartHandshake,
  PersonStanding,
  UserRound,
} from "lucide-react";

const services = [
  {
    icon: Baby,
    title: "Atendimento infantil",
    description: "Orientações para mães, pais e responsáveis.",
  },
  {
    icon: PersonStanding,
    title: "Adolescentes",
    description: "Acompanhamento em uma fase de mudanças.",
  },
  {
    icon: UserRound,
    title: "Atendimento individual",
    description: "Um espaço de escuta para questões pessoais.",
  },
  {
    icon: HeartHandshake,
    title: "Terapia de casal",
    description: "Um espaço de diálogo sobre a relação.",
  },
];

export function ClinicServices() {
  return (
    <section
      id="atendimentos"
      aria-labelledby="services-title"
      className="mx-auto grid max-w-6xl scroll-mt-24 gap-8 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.35fr)] lg:items-center lg:gap-10"
    >
      <div className="max-w-lg">
        <p className="mb-3 flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-primary">
          <span
            aria-hidden="true"
            className="h-px w-8 shrink-0 bg-primary/50"
          />
          Nossos atendimentos
        </p>
        <h2
          id="services-title"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Cuidado em cada fase da vida
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Converse com a recepção sobre o tipo de atendimento que você procura e
          consulte a disponibilidade da equipe.
        </p>
        <Link
          href="/#contato"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          Tirar dúvidas sobre atendimentos
          <ArrowRight aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
        {services.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="relative grid h-24 place-items-center overflow-hidden border-b border-primary/10 bg-gradient-to-br from-primary/15 to-primary/5 before:absolute before:-top-8 before:-right-6 before:size-24 before:rounded-full before:border before:border-primary/15 after:absolute after:-bottom-12 after:-left-4 after:size-24 after:rounded-full after:border after:border-primary/15">
              <span className="relative z-10 grid size-12 place-items-center rounded-2xl border border-primary/15 bg-card text-primary shadow-sm">
                <Icon aria-hidden="true" className="size-6" strokeWidth={1.6} />
              </span>
            </div>
            <div className="p-3 sm:p-4">
              <h3 className="text-sm font-semibold leading-snug text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
