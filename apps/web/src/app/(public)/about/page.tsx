import Link from "next/link";
import { HeartHandshake, MessageCircle, UserRoundCheck } from "lucide-react";
import { ClinicTeam } from "@/components/public/clinic-team";
import { ClinicGallery } from "@/components/public/clinic-space";

export default function AboutPage() {
  return (
    <div>
      <section className="border-b border-border bg-primary/5">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Sobre a Leperapia Clinic
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            Cada pessoa tem uma história.
            <br />
            <span className="text-primary">Aqui, ela encontra escuta.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            A Leperapia Clinic reúne o atendimento psicológico e o apoio da
            recepção para tornar o caminho até a consulta mais claro e
            acolhedor.
          </p>
          <Link
            href="/explore/calendar"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Conhecer os horários
          </Link>
        </div>
      </section>
      <section
        className="mx-auto max-w-6xl px-4 py-14 md:px-8"
        aria-label="Nossa forma de cuidar"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: HeartHandshake,
              title: "Acolher",
              text: "Receber cada pessoa com respeito, considerando suas necessidades e seu momento de vida.",
            },
            {
              icon: MessageCircle,
              title: "Escutar",
              text: "Valorizar o diálogo e a construção do vínculo entre paciente e profissional.",
            },
            {
              icon: UserRoundCheck,
              title: "Acompanhar",
              text: "Facilitar a escolha de horários e o acompanhamento das solicitações, sem perder o contato com a recepção.",
            },
          ].map((value) => (
            <article
              key={value.title}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <value.icon className="mb-5 size-7 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {value.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {value.text}
              </p>
            </article>
          ))}
        </div>
      </section>
      <div className="border-y border-border bg-muted/30">
        <ClinicTeam />
      </div>
      <ClinicGallery />
    </div>
  );
}
