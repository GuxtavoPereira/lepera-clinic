import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-8">Contato e Agendamento</h1>
      <p className="text-center text-muted-foreground mb-12">
        Solicite seu atendimento pelo portal do paciente. A recepção analisa suas preferências e confirma o horário no sistema.
      </p>

      <div className="grid md:grid-cols-2 gap-12">
        <section aria-labelledby="appointment-heading" className="flex flex-col gap-4">
          <h2 id="appointment-heading" className="text-xl font-bold">Solicitar Agendamento</h2>
          <p className="text-muted-foreground">
            Entre na sua conta para escolher o profissional, a data e o turno de preferência. Você também pode deixar uma observação para a recepção.
          </p>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
            <li>Crie seu cadastro de paciente ou entre com e-mail e senha.</li>
            <li>Acesse Solicitar agendamento e envie suas preferências.</li>
            <li>Acompanhe a resposta em Minhas solicitações e suas consultas no portal.</li>
          </ol>
          <Link href="/auth/login?next=/patient/request-appointment" className="bg-primary text-primary-foreground text-center font-bold py-2 px-4 rounded-md mt-2 hover:bg-primary/90">
            Entrar para solicitar
          </Link>
          <Link href="/auth/register" className="border text-center font-medium py-2 px-4 rounded-md hover:bg-muted">
            Criar conta de paciente
          </Link>
          <Link href="/patient/request-appointment" className="text-sm text-primary underline underline-offset-4">
            Já estou conectado: abrir solicitações
          </Link>
          <p className="text-xs text-muted-foreground">
            O envio registra uma solicitação no portal. O agendamento fica confirmado após a aprovação da recepção.
          </p>
        </section>

        <div className="bg-muted p-8 rounded-lg flex flex-col gap-6">
          <div>
            <h3 className="font-bold text-lg">Endereço da Clínica</h3>
            <p className="text-muted-foreground">Av. Dr. Arthur da Costa Filho, 100 - Centro<br/>Caraguatatuba - SP</p>
          </div>
          <div>
            <h3 className="font-bold text-lg">Telefone / WhatsApp</h3>
            <p className="text-muted-foreground">(12) 99999-9999</p>
          </div>
          <div>
            <h3 className="font-bold text-lg">Horário de Funcionamento</h3>
            <p className="text-muted-foreground">Segunda a Sexta: 08h às 18h<br/>Sábado: 08h às 12h</p>
          </div>
          <p className="text-xs text-muted-foreground">Dados de contato demonstrativos do projeto acadêmico. Para solicitar atendimento, utilize o portal.</p>
        </div>
      </div>
    </div>
  );
}
