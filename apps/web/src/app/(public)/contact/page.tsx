import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Mail,
  MessagesSquare,
} from "lucide-react";

export default function ContactPage() {
  return (
    <div>
      <section className="border-b border-border bg-primary/5">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-8 md:py-20">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Contato e agendamento
          </p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
            O primeiro passo pode
            <br />
            ser mais simples.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Consulte os horários dos profissionais, solicite sua consulta e
            acompanhe a confirmação da recepção pelo portal.
          </p>
        </div>
      </section>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 md:px-8 lg:grid-cols-[1.5fr_1fr]">
        <section
          aria-labelledby="booking-title"
          className="rounded-2xl border border-border bg-card p-6 sm:p-8"
        >
          <CalendarDays className="mb-5 size-8 text-primary" />
          <h2
            id="booking-title"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Encontre seu horário
          </h2>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            Veja os profissionais e os horários livres. Com o acesso do Google,
            você pode explorar a agenda; para solicitar uma consulta, conclua o
            cadastro com seus dados pessoais.
          </p>
          <ol className="my-7 space-y-5">
            {[
              [
                "Escolha o profissional",
                "Conheça as especialidades e as abordagens da equipe.",
              ],
              [
                "Selecione o dia e o horário",
                "As opções seguem a disponibilidade cadastrada pelo profissional.",
              ],
              [
                "Envie sua solicitação",
                "Aguarde a análise da recepção e acompanhe o status no portal. O envio ainda não confirma a consulta.",
              ],
            ].map(([title, text], index) => (
              <li key={title} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                >
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <Link
            href="/explore/calendar"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 sm:w-auto"
          >
            Ver horários disponíveis
            <ArrowRight className="size-4" />
          </Link>
          <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
            Já possui uma conta?{" "}
            <Link
              href="/auth/login?next=/patient/request-appointment"
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              Entrar e solicitar consulta
            </Link>
            <span className="mx-2" aria-hidden="true">
              ·
            </span>
            <Link
              href="/auth/register"
              className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            >
              Criar conta
            </Link>
          </div>
        </section>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <CalendarPlus className="mb-4 size-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Precisa de flexibilidade?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Escolha a opção{" "}
              <strong className="text-foreground">Encaixe</strong> na
              solicitação e informe sua preferência de dia e período. A recepção
              avaliará as possibilidades com o profissional antes de confirmar.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-6">
            <Mail className="mb-4 size-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Fale com a clínica
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Para dúvidas gerais sobre o atendimento:
            </p>
            <a
              href="mailto:leperapiaoficial@gmail.com"
              className="mt-2 inline-flex min-h-11 max-w-full items-center break-all text-sm font-semibold text-primary underline underline-offset-4"
            >
              leperapiaoficial@gmail.com
            </a>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Evite enviar informações clínicas por e-mail. Use o portal para
              consultar o andamento dos agendamentos.
            </p>
          </section>
          <section className="rounded-2xl bg-primary/10 p-6">
            <MessagesSquare className="mb-4 size-6 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Conheça quem vai acolher você
            </h2>
            <Link
              href="/about#equipe"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary"
            >
              Ver equipe da clínica
              <ArrowRight className="size-4" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
