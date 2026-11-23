const questions = [
  {
    question: "As consultas são presenciais ou online?",
    answer: "Nossos atendimentos são exclusivamente presenciais. A consulta acontece na clínica, com o profissional e no horário confirmados pela recepção.",
  },
  {
    question: "Como solicito uma consulta?",
    answer: "Consulte os horários disponíveis, entre na sua conta e escolha o profissional, o dia e o horário desejados. Revise as informações e envie a solicitação pelo portal do paciente.",
  },
  {
    question: "Enviar uma solicitação já confirma meu horário?",
    answer: "Ainda não. A recepção analisa o pedido e confere a disponibilidade antes de confirmar. Acompanhe a situação no portal; um pedido pendente não é uma consulta confirmada.",
  },
  {
    question: "E se eu não encontrar um horário adequado?",
    answer: "Escolha a opção Encaixe e indique sua preferência de data ou período. A recepção verifica as possibilidades. O pedido de encaixe também depende de confirmação.",
  },
  {
    question: "Como acompanho ou cancelo uma consulta?",
    answer: "Entre no portal e acesse Minhas consultas. O cancelamento pelo paciente exige pelo menos 24 horas de antecedência. Se faltar menos tempo ou precisar de ajuda para remarcar, procure a recepção.",
  },
  {
    question: "Como posso falar com a recepção?",
    answer: "Para dúvidas gerais, escreva para leperapiaoficial@gmail.com. Acompanhe seus agendamentos pelo portal e evite enviar informações clínicas por e-mail.",
  },
];

export function ClinicFaq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 md:px-8">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">Antes da sua consulta</p>
      <h2 id="faq-title" className="text-3xl font-semibold tracking-tight text-foreground">Perguntas frequentes</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">Respostas para ajudar você a dar o próximo passo com tranquilidade.</p>
      <div className="mt-8 grid gap-3">
        {questions.map(({ question, answer }) => (
          <details key={question} className="group rounded-2xl border border-border bg-card open:border-primary/40">
            <summary className="min-h-12 cursor-pointer rounded-2xl px-5 py-4 font-medium text-foreground marker:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">{question}</summary>
            <p className="px-5 pb-5 leading-relaxed text-muted-foreground">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
