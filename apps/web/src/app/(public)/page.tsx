import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CalendarPlus,
  Check,
  Heart,
  HeartHandshake,
  Mail,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { ClinicGallery } from "@/components/public/clinic-space";
import { ClinicServices } from "@/components/public/clinic-services";
import { ClinicTeam } from "@/components/public/clinic-team";

export const metadata: Metadata = {
  description:
    "Conheça o atendimento psicológico da Leperapia Clinic, nossa equipe e os horários disponíveis para consulta.",
};

const steps = [
  {
    title: "Conheça os profissionais",
    text: "Veja especialidades, abordagens e escolha com quem deseja conversar.",
  },
  {
    title: "Escolha o melhor horário",
    text: "Consulte a disponibilidade e solicite o dia e o horário que fazem sentido para você.",
  },
  {
    title: "Acompanhe a confirmação",
    text: "A recepção analisa sua solicitação. Você acompanha o retorno no portal do paciente.",
  },
];

const values = [
  {
    icon: HeartHandshake,
    title: "Acolher",
    text: "Receber cada pessoa com respeito ao seu momento de vida.",
  },
  {
    icon: MessageCircle,
    title: "Escutar",
    text: "Valorizar o diálogo e o vínculo entre paciente e profissional.",
  },
  {
    icon: UserRoundCheck,
    title: "Acompanhar",
    text: "Dar clareza a cada etapa, com o apoio da recepção.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-muted/40 dark:bg-background not-dark:[--muted-foreground:oklch(0.53_0_0)]">
      <section
        id="inicio"
        aria-labelledby="landing-title"
        className="relative isolate scroll-mt-24 overflow-hidden border-b border-border bg-primary/5"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -bottom-20 -left-16 size-44 rounded-full bg-primary/10 sm:-bottom-24 sm:-left-20 sm:size-64" />
          <div className="absolute bottom-12 left-24 size-3 rounded-full bg-primary/25 sm:bottom-20 sm:size-4" />
          <Heart
            className="absolute -right-9 top-5 size-32 rotate-12 text-primary/15 sm:-right-6 sm:top-7 sm:size-44"
            strokeWidth={1}
          />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs font-semibold text-primary">
              <HeartHandshake className="size-4" />
              Leperapia Clinic · Psicologia e acolhimento
            </p>
            <h1
              id="landing-title"
              className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Encontre apoio
              <br />
              <span className="text-primary">nos momentos difíceis.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Um espaço de escuta e acolhimento. Conheça nossa equipe de
              psicologia e encontre um horário para começar.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/explore/calendar"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Ver horários disponíveis
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/#sobre"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Conhecer a clínica
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              Escolha o horário e acompanhe sua solicitação pelo portal.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-xl">
            <div className="overflow-hidden rounded-[2rem] border border-primary/15 bg-card p-2 shadow-sm">
              <Image
                src="/clinic/hero.webp"
                alt="Sofá claro e planta ao lado de uma janela com cortinas"
                width={1280}
                height={880}
                sizes="(min-width: 1152px) 520px, (min-width: 1024px) 47vw, (min-width: 640px) 560px, calc(100vw - 3rem)"
                fetchPriority="high"
                loading="eager"
                className="h-auto w-full rounded-[1.5rem]"
              />
            </div>
            <div className="absolute bottom-5 left-5 hidden items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex">
              <span className="rounded-xl bg-primary/10 p-3 text-primary">
                <MessageCircle className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                Seu cuidado,
                <br />
                <span className="font-normal text-muted-foreground">
                  com atenção em cada etapa.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>
      <section
        className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-8"
        aria-label="Nosso atendimento"
      >
        {[
          {
            icon: HeartHandshake,
            title: "Escuta e acolhimento",
            text: "Um primeiro contato para conhecer suas necessidades e os profissionais da clínica.",
          },
          {
            icon: CalendarDays,
            title: "Agenda ao seu alcance",
            text: "Horários disponíveis em um só lugar. Se precisar de flexibilidade, solicite um encaixe.",
          },
          {
            icon: ShieldCheck,
            title: "Seu espaço no portal",
            text: "Acompanhe suas consultas e solicitações com acesso à sua própria conta.",
          },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-4">
            <span className="rounded-xl bg-primary/10 p-3 text-primary">
              <item.icon className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold text-foreground">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.text}
              </p>
            </div>
          </div>
        ))}
      </section>
      <div className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -right-16 top-3 size-36 rounded-full border-[1.25rem] border-primary/10 sm:-right-20 sm:size-56 sm:border-[1.75rem]" />
          <div className="absolute right-14 top-8 size-2.5 rounded-full bg-primary/20 sm:right-32 sm:size-3" />
          <Brain
            className="absolute -bottom-10 -left-5 size-28 -rotate-12 text-primary/12 sm:-bottom-12 sm:size-40"
            strokeWidth={1}
          />
        </div>
        <ClinicServices />
      </div>
      <div className="border-y border-border bg-muted/30">
        <ClinicTeam />
      </div>
      <section
        id="sobre"
        aria-labelledby="about-title"
        className="relative isolate scroll-mt-24 overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <div className="absolute -right-16 -top-12 size-36 rounded-full border-[1.5rem] border-primary/10 sm:-right-20 sm:-top-20 sm:size-60" />
          <Heart
            className="absolute -bottom-10 -left-8 size-28 -rotate-12 text-primary/15 sm:-left-5 sm:size-44"
            strokeWidth={1}
          />
        </div>
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:px-8 md:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div className="min-w-0 lg:order-2">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
              Sobre a Leperapia Clinic
            </p>
            <h2
              id="about-title"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Uma clínica feita para cuidar de você.
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
              Cada pessoa tem uma história. A Leperapia Clinic reúne o
              atendimento psicológico e o apoio da recepção para tornar o
              caminho até a consulta mais claro e acolhedor.
            </p>
            <ul className="mt-6 grid gap-4">
              {values.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-foreground">{title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border bg-card p-2">
            <Image
              src="/clinic/about.webp"
              alt="Planta iluminada pelo sol ao lado de um sofá bege"
              width={960}
              height={720}
              sizes="(min-width: 1152px) 480px, (min-width: 1024px) 45vw, (min-width: 768px) calc(100vw - 5rem), calc(100vw - 3rem)"
              className="h-auto w-full rounded-[1.25rem]"
            />
          </div>
        </div>
      </section>
      <div className="border-y border-border bg-primary/5">
        <ClinicGallery />
      </div>
      <section className="relative isolate overflow-hidden border-y border-border bg-muted/35">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <MessagesSquare
            className="absolute -right-5 -top-6 size-28 rotate-12 text-primary/15 sm:right-8 sm:size-36"
            strokeWidth={1}
          />
          <div className="absolute -bottom-14 -left-12 size-36 rounded-full bg-primary/8 sm:size-48" />
          <div className="absolute bottom-5 left-20 size-2.5 rounded-full bg-primary/20 sm:left-36 sm:size-3" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Do primeiro contato à consulta
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Um caminho simples para começar.
          </h2>
          <ol className="mt-9 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <span
                  aria-hidden="true"
                  className="mb-5 flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                >
                  {index + 1}
                </span>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section
        id="contato"
        aria-labelledby="contact-title"
        className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:px-8 md:py-20"
      >
        <div className="relative isolate overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground sm:p-10 lg:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -right-24 -top-32 size-96 rounded-full border-[3rem] border-primary-foreground/10" />
            <Heart
              className="absolute -bottom-10 -right-4 size-40 rotate-12 text-primary-foreground/15 sm:right-12 sm:size-52"
              strokeWidth={1}
            />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest">
            Contato e agendamento
          </p>
          <h2
            id="contact-title"
            className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Vamos encontrar um tempo para você?
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed">
            Consulte os horários dos profissionais e acompanhe a confirmação da
            recepção pelo portal do paciente.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/explore/calendar"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-foreground px-5 text-sm font-semibold text-primary hover:opacity-90"
            >
              Ver horários disponíveis
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link
              href="/auth/login?next=/patient/request-appointment"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-primary-foreground/50 px-5 text-sm font-semibold hover:bg-primary-foreground/10"
            >
              Entrar e solicitar consulta
            </Link>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <Mail aria-hidden="true" className="mb-3 size-6 text-primary" />
            <h3 className="font-semibold text-foreground">
              Fale com a recepção
            </h3>
            <a
              href="mailto:leperapiaoficial@gmail.com"
              className="mt-2 inline-flex min-h-11 items-center break-all text-sm font-semibold text-primary underline underline-offset-4"
            >
              leperapiaoficial@gmail.com
            </a>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Para dúvidas gerais sobre o atendimento. Use o portal para
              acompanhar agendamentos e evite enviar dados clínicos por e-mail.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <CalendarPlus
              aria-hidden="true"
              className="mb-3 size-6 text-primary"
            />
            <h3 className="font-semibold text-foreground">
              Precisa de flexibilidade?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Selecione Encaixe na solicitação e indique sua preferência de dia
              e período. A recepção verifica as opções antes de confirmar.
            </p>
            <Link
              href="/auth/register"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4"
            >
              Criar conta no portal
            </Link>
          </article>
        </div>
      </section>
    </div>
  );
}
