import React from "react";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-bold text-center mb-8">Contato e Agendamento</h1>
      <p className="text-center text-muted-foreground mb-12">
        Estamos aqui para ajudar. Preencha o formulário abaixo para tirar dúvidas, pedir informações ou falar diretamente com a nossa equipe de recepção.
      </p>

      <div className="grid md:grid-cols-2 gap-12">
        <form className="flex flex-col gap-4">
          <div>
            <label htmlFor="name" className="text-sm font-medium">Nome Completo</label>
            <input id="name" type="text" className="w-full border rounded-md p-2 mt-1" placeholder="Seu nome" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">E-mail</label>
            <input id="email" type="email" className="w-full border rounded-md p-2 mt-1" placeholder="seu@email.com" />
          </div>
          <div>
            <label htmlFor="message" className="text-sm font-medium">Mensagem</label>
            <textarea id="message" rows={4} className="w-full border rounded-md p-2 mt-1" placeholder="Como podemos ajudar?"></textarea>
          </div>
          <button type="button" className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-md mt-2">
            Solicitar Agendamento
          </button>
        </form>

        <div className="bg-muted p-8 rounded-lg flex flex-col gap-6">
          <div>
            <h3 className="font-bold text-lg">Endereço Clinica</h3>
            <p className="text-muted-foreground">Av. clinica, 100<br/>Perque, Caraguatatuba - SP</p>
          </div>
          <div>
            <h3 className="font-bold text-lg">Telefone / WhatsApp</h3>
            <p className="text-muted-foreground">(12) 99999-9999</p>
          </div>
          <div>
            <h3 className="font-bold text-lg">Horário de Funcionamento</h3>
            <p className="text-muted-foreground">Segunda a Sexta: 08h às 18h<br/>Sábado: 08h às 12h</p>
          </div>
        </div>
      </div>
    </div>
  );
}