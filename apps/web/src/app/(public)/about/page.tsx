import React from "react";
import { Target, Lightbulb, Heart, ShieldCheck } from "lucide-react";

export default function SobrePage() {
  return (
    <main className="min-h-screen bg-slate-50 py-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
            Sobre a <span className="text-primary">Leperapia Clinic</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Conheça nossa história, nossos desafios e como estamos usando a
            tecnologia para transformar o atendimento clínico.
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-100 pb-4">
            Nosso Contexto e Motivação
          </h2>

          <div className="space-y-4 text-slate-600 leading-relaxed text-justify">
            <p>
              A <strong>Leperapia Clinic</strong> nasceu com o propósito de
              oferecer atendimento humanizado e especializado na área da saúde.
              No entanto, com o crescimento constante do número de pacientes nos
              últimos anos, os processos administrativos tradicionais começaram
              a apresentar falhas. A equipe de recepção passou a enfrentar
              problemas diários com agendamentos manuais, organização de filas
              de espera em papel e dificuldade na localização rápida do
              histórico das sessões.
            </p>
            <p>
              Diante desse cenário, ficou claro que a qualidade do atendimento
              médico estava esbarrando na ineficiência estrutural. A sobrecarga
              da recepção afetava diretamente a experiência do paciente, que
              precisava lidar com longos tempos de espera telefônica e
              desorganização presencial. O problema deixou de ser apenas
              administrativo e passou a ser um obstáculo para a promoção do
              bem-estar.
            </p>
            <p>
              É exatamente para solucionar esses gargalos que o sistema web da{" "}
              <strong>Leperapia Clinic</strong> está sendo desenvolvido. Nossa
              plataforma digital visa modernizar a clínica ao centralizar o
              agendamento de sessões, a gestão de pacientes e o controle da
              lista de espera em um <i>dashboard</i> moderno e intuitivo. O
              objetivo central do sistema é automatizar a burocracia, otimizando
              o tempo da equipe para que o foco volte a ser exclusivamente a
              saúde e o acolhimento do paciente.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Nossa Missão</h3>
            <p className="text-slate-600 leading-relaxed">
              Democratizar e agilizar o acesso à saúde através da tecnologia,
              proporcionando uma gestão clínica eficiente, transparente e
              acolhedora, onde o paciente é sempre a prioridade.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
            <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Lightbulb className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Nossa Visão</h3>
            <p className="text-slate-600 leading-relaxed">
              Ser referência acadêmica e tecnológica em modernização de
              processos clínicos, transformando a recepção médica tradicional em
              uma experiência 100% digital e sem atritos.
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center space-y-6">
          <h2 className="text-2xl font-bold text-slate-800">
            Equipe de Desenvolvimento
          </h2>
          <p className="text-slate-600">
            Projeto desenvolvido para aplicar os melhores conceitos de UI/UX,
            Engenharia de Software e Componentização Web.
          </p>
          <div className="flex justify-center gap-8 pt-4">
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Heart className="h-8 w-8" />
              </div>
              <span className="font-semibold text-slate-800">
                Gustavo
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Heart className="h-8 w-8" />
              </div>
              <span className="font-semibold text-slate-800">
                Clemerson
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Heart className="h-8 w-8" />
              </div>
              <span className="font-semibold text-slate-800">
Ary              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Heart className="h-8 w-8" />
              </div>
              <span className="font-semibold text-slate-800">
                Giovana
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Heart className="h-8 w-8" />
              </div>
              <span className="font-semibold text-slate-800">
                Nathanael
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                <Heart className="h-8 w-8" />
              </div>
              <span className="font-semibold text-slate-800">
                Kawã
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
