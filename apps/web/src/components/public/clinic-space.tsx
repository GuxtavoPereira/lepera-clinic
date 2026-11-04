import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Monitor, ShieldCheck } from "lucide-react";

const spaces = [
  {
    src: "/clinic/reception.webp",
    title: "Recepção e acolhimento",
    alt: "Cadeiras em uma sala de espera com planta e piso de madeira",
  },
  {
    src: "/clinic/consultation.webp",
    title: "Espaço de escuta",
    alt: "Sofá bege com almofadas em um ambiente com luz natural",
  },
];

export function ClinicGallery() {
  return (
    <section
      id="espaco"
      className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-8 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[0.85fr_1.5fr] lg:gap-12"
      aria-labelledby="spaces-title"
    >
      <div className="max-w-2xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary dark:text-sidebar-primary">
          Nosso espaço
        </p>
        <h2
          id="spaces-title"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Um ambiente acolhedor para o seu atendimento
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Da recepção ao consultório, cada etapa da experiência deve respeitar
          seu tempo e sua privacidade.
        </p>
        <ul className="mt-5 space-y-3 text-sm text-foreground">
          <li className="flex items-center gap-2">
            <ShieldCheck
              aria-hidden="true"
              className="size-4 shrink-0 text-primary dark:text-sidebar-primary"
            />
            Privacidade no atendimento
          </li>
          <li className="flex items-center gap-2">
            <Monitor
              aria-hidden="true"
              className="size-4 shrink-0 text-primary dark:text-sidebar-primary"
            />
            Opções de atendimento presencial e online
          </li>
          <li className="flex items-center gap-2">
            <CalendarDays
              aria-hidden="true"
              className="size-4 shrink-0 text-primary dark:text-sidebar-primary"
            />
            Horários conforme a agenda da equipe
          </li>
        </ul>
        <Link
          href="/#contato"
          className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline dark:text-sidebar-primary"
        >
          Falar com a recepção
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        {spaces.map(({ src, title, alt }) => (
          <figure
            key={src}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <Image
              src={src}
              alt={alt}
              width={768}
              height={528}
              sizes="(min-width: 1152px) 325px, (min-width: 1024px) 28vw, (min-width: 640px) 46vw, calc(100vw - 2rem)"
              className="h-auto w-full"
            />
            <figcaption className="p-5 font-semibold text-foreground">
              {title}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
