import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { ClinicGallery, ClinicSpace } from "@/components/public/clinic-space";
import { ClinicTeam } from "@/components/public/clinic-team";

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

export default function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-primary/5">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-xs font-semibold text-primary">
              <HeartHandshake className="size-4" />
              Leperapia Clinic · Psicologia e acolhimento
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Um espaço de escuta.
              <br />
              <span className="text-primary">Um tempo para você.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Cuidar de você pode começar com uma conversa. Conheça nossa equipe
              e encontre um horário para dar o próximo passo.
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
                href="/about#equipe"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-background px-6 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Conhecer a equipe
              </Link>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              Escolha o horário e acompanhe sua solicitação pelo portal.
            </p>
          </div>
          <figure className="relative mx-auto w-full max-w-lg">
            <div className="overflow-hidden rounded-[2rem] border border-primary/15 bg-card p-2 shadow-sm">
              <ClinicSpace
                space="consultation"
                className="w-full rounded-[1.5rem]"
              />
            </div>
            <figcaption className="mt-3 text-center text-xs text-muted-foreground">
              Ilustração dos ambientes
            </figcaption>
            <div className="absolute -bottom-2 left-3 hidden items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex">
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
          </figure>
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
      <section className="border-y border-border bg-muted/35">
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
      <ClinicTeam />
      <div className="bg-primary/5">
        <ClinicGallery />
      </div>
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-primary p-8 text-primary-foreground md:flex-row md:items-center md:p-12">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Vamos encontrar um tempo para você?
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed opacity-90">
              Explore a agenda ou fale com a recepção para entender os próximos
              passos.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-background px-6 text-sm font-semibold text-primary hover:bg-background/90"
          >
            Começar agora
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
