export const clinicalDocumentTypes = [
  "PSYCHOLOGICAL_REPORT",
  "PROGRESS_RECORD",
  "CLINICAL_REPORT",
  "INITIAL_INTERVIEW",
  "PSYCHOLOGICAL_ASSESSMENT",
  "GENERAL_NOTE",
  "FIELD_DIARY",
  "GUARDIAN_FEEDBACK",
  "OTHER",
] as const;

export type ClinicalDocumentType = (typeof clinicalDocumentTypes)[number];

export const clinicalDocumentStatuses = [
  "DRAFT",
  "SIGNED",
  "SUPERSEDED",
] as const;

export type ClinicalDocumentStatus = (typeof clinicalDocumentStatuses)[number];

export const clinicalDocumentVisibilities = [
  "INTERNAL",
  "PATIENT_RELEASED",
  "GUARDIAN_RELEASED",
] as const;

export type ClinicalDocumentVisibility =
  (typeof clinicalDocumentVisibilities)[number];

/** Tipos estritamente internos: anotações de trabalho e diário de estágio nunca podem ser liberados. */
export const internalOnlyDocumentTypes: readonly ClinicalDocumentType[] = [
  "GENERAL_NOTE",
  "FIELD_DIARY",
];

export type ClinicalDocumentSectionTemplate = {
  key: string;
  label: string;
  placeholder: string;
};

export type ClinicalDocumentTemplate = {
  type: ClinicalDocumentType;
  label: string;
  shortDescription: string;
  defaultTitle: string;
  internalOnly: boolean;
  sections: readonly ClinicalDocumentSectionTemplate[];
};

export const clinicalDocumentTemplates: Record<
  ClinicalDocumentType,
  ClinicalDocumentTemplate
> = {
  PSYCHOLOGICAL_REPORT: {
    type: "PSYCHOLOGICAL_REPORT",
    label: "Laudo psicológico",
    shortDescription:
      "Documento técnico resultante de avaliação psicológica, estruturado em demanda, procedimento, análise e conclusão.",
    defaultTitle: "Laudo psicológico",
    internalOnly: false,
    sections: [
      {
        key: "demand",
        label: "Descrição da demanda",
        placeholder:
          "Motivo da solicitação, solicitante e contexto do pedido de avaliação.",
      },
      {
        key: "procedure",
        label: "Procedimento",
        placeholder:
          "Recursos, entrevistas, número de encontros e referenciais técnicos utilizados.",
      },
      {
        key: "analysis",
        label: "Análise",
        placeholder:
          "Exposição técnica fundamentada dos dados colhidos, sem expor detalhes desnecessários.",
      },
      {
        key: "conclusion",
        label: "Conclusão e encaminhamentos",
        placeholder:
          "Síntese conclusiva, recomendações ou encaminhamentos pertinentes.",
      },
    ],
  },
  PROGRESS_RECORD: {
    type: "PROGRESS_RECORD",
    label: "Prontuário documental",
    shortDescription:
      "Registro documental consolidado complementar às evoluções de sessão.",
    defaultTitle: "Registro de prontuário",
    internalOnly: false,
    sections: [
      {
        key: "summary",
        label: "Síntese do acompanhamento",
        placeholder: "Resumo dos objetivos terapêuticos e marcos do processo.",
      },
      {
        key: "conduct",
        label: "Condutas e encaminhamentos",
        placeholder: "Intervenções adotadas e encaminhamentos realizados.",
      },
      {
        key: "notes",
        label: "Observações adicionais",
        placeholder: "Informações relevantes ao seguimento clínico.",
      },
    ],
  },
  CLINICAL_REPORT: {
    type: "CLINICAL_REPORT",
    label: "Relatório psicológico",
    shortDescription:
      "Comunicação técnica sobre o acompanhamento psicológico prestado ao paciente.",
    defaultTitle: "Relatório psicológico",
    internalOnly: false,
    sections: [
      {
        key: "demand",
        label: "Descrição da demanda",
        placeholder: "Finalidade do relatório e contexto da solicitação.",
      },
      {
        key: "procedure",
        label: "Procedimento",
        placeholder: "Abordagem, frequência dos atendimentos e recursos utilizados.",
      },
      {
        key: "analysis",
        label: "Análise",
        placeholder: "Descrição técnica do processo e evolução observada.",
      },
      {
        key: "conclusion",
        label: "Conclusão",
        placeholder: "Considerações finais e sugestões de continuidade.",
      },
    ],
  },
  INITIAL_INTERVIEW: {
    type: "INITIAL_INTERVIEW",
    label: "Rapor / Entrevista inicial",
    shortDescription:
      "Acolhimento e entrevista inicial com o paciente (Rapor): queixa, histórico, contexto e combinados.",
    defaultTitle: "Rapor — Entrevista inicial",
    internalOnly: false,
    sections: [
      {
        key: "complaint",
        label: "Motivo da procura e queixa inicial",
        placeholder: "O que trouxe o paciente ao atendimento neste momento.",
      },
      {
        key: "history",
        label: "História clínica e atendimentos anteriores",
        placeholder: "Acompanhamentos prévios, uso de medicações e marcos relevantes.",
      },
      {
        key: "context",
        label: "Contexto familiar, social e rotina",
        placeholder: "Rede de apoio, trabalho/estudos e dinâmica cotidiana.",
      },
      {
        key: "agreements",
        label: "Impressões iniciais e combinados",
        placeholder: "Contrato terapêutico, frequência e objetivos iniciais.",
      },
    ],
  },
  PSYCHOLOGICAL_ASSESSMENT: {
    type: "PSYCHOLOGICAL_ASSESSMENT",
    label: "Avaliação psicológica",
    shortDescription:
      "Registro estruturado do processo avaliativo, instrumentos aplicados e integração clínica.",
    defaultTitle: "Avaliação psicológica",
    internalOnly: false,
    sections: [
      {
        key: "objective",
        label: "Objetivo da avaliação",
        placeholder: "Perguntas norteadoras e escopo do processo avaliativo.",
      },
      {
        key: "instruments",
        label: "Instrumentos e técnicas utilizadas",
        placeholder: "Entrevistas, observações e testes aplicados (com edição).",
      },
      {
        key: "integration",
        label: "Resultados e integração clínica",
        placeholder: "Integração dos achados qualitativos e quantitativos.",
      },
      {
        key: "recommendations",
        label: "Recomendações",
        placeholder: "Orientações terapêuticas, educacionais ou encaminhamentos.",
      },
    ],
  },
  GENERAL_NOTE: {
    type: "GENERAL_NOTE",
    label: "Anotação geral sobre o paciente",
    shortDescription:
      "Registro livre de trabalho do profissional. Permanece interno e não é liberado automaticamente.",
    defaultTitle: "Anotação geral",
    internalOnly: true,
    sections: [
      {
        key: "body",
        label: "Anotação",
        placeholder: "Registre observações gerais, lembretes técnicos ou hipóteses de trabalho.",
      },
    ],
  },
  FIELD_DIARY: {
    type: "FIELD_DIARY",
    label: "Diário de campo (estágio)",
    shortDescription:
      "Registro reflexivo para psicólogos em estágio e supervisão clínica. Permanece estritamente interno.",
    defaultTitle: "Diário de campo — Estágio",
    internalOnly: true,
    sections: [
      {
        key: "activity",
        label: "Contexto e atividade realizada",
        placeholder: "Descrição do encontro, atendimento ou atividade de estágio.",
      },
      {
        key: "observations",
        label: "Vivências e observações",
        placeholder: "Percepções clínicas, manejos realizados e dificuldades encontradas.",
      },
      {
        key: "reflection",
        label: "Reflexão teórico-técnica",
        placeholder: "Articulação com a abordagem teórica e literatura estudada.",
      },
      {
        key: "supervision",
        label: "Pontos para supervisão",
        placeholder: "Dúvidas e tópicos a discutir com o supervisor.",
      },
    ],
  },
  GUARDIAN_FEEDBACK: {
    type: "GUARDIAN_FEEDBACK",
    label: "Devolutiva para responsáveis",
    shortDescription:
      "Documento de retorno técnico destinado aos responsáveis legais de pacientes menores.",
    defaultTitle: "Devolutiva para responsáveis",
    internalOnly: false,
    sections: [
      {
        key: "synthesis",
        label: "Síntese do acompanhamento",
        placeholder:
          "Aspectos gerais do processo, preservando o sigilo e o vínculo com o paciente.",
      },
      {
        key: "guidance",
        label: "Orientações aos responsáveis",
        placeholder: "Recomendações práticas para o ambiente familiar e escolar.",
      },
      {
        key: "nextSteps",
        label: "Encaminhamentos e próximos passos",
        placeholder: "Continuidade do acompanhamento e novos encontros de devolutiva.",
      },
    ],
  },
  OTHER: {
    type: "OTHER",
    label: "Outro documento psicológico",
    shortDescription:
      "Modelo flexível para outros documentos definidos pelo profissional (ex.: declaração, encaminhamento, parecer).",
    defaultTitle: "Documento psicológico",
    internalOnly: false,
    sections: [
      {
        key: "purpose",
        label: "Finalidade / Assunto",
        placeholder: "Informe o objetivo ou tipo específico deste documento.",
      },
      {
        key: "body",
        label: "Conteúdo",
        placeholder: "Redija o corpo do documento.",
      },
      {
        key: "closing",
        label: "Considerações finais",
        placeholder: "Encerramento ou observações complementares (opcional).",
      },
    ],
  },
};

export const clinicalDocumentTypeLabels: Record<ClinicalDocumentType, string> =
  Object.fromEntries(
    clinicalDocumentTypes.map((type) => [
      type,
      clinicalDocumentTemplates[type].label,
    ]),
  ) as Record<ClinicalDocumentType, string>;

export const clinicalDocumentStatusLabels: Record<
  ClinicalDocumentStatus,
  string
> = {
  DRAFT: "Rascunho",
  SIGNED: "Assinado",
  SUPERSEDED: "Substituído por revisão",
};

export const clinicalDocumentVisibilityLabels: Record<
  ClinicalDocumentVisibility,
  string
> = {
  INTERNAL: "Interno (somente profissional)",
  PATIENT_RELEASED: "Liberado ao paciente",
  GUARDIAN_RELEASED: "Liberado ao responsável",
};

export function isInternalOnlyDocumentType(
  type: ClinicalDocumentType,
): boolean {
  return internalOnlyDocumentTypes.includes(type);
}
