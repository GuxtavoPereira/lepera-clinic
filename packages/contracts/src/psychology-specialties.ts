/** Especialidades reconhecidas pelo CFP. Abordagens clínicas são informadas separadamente. */
export const PSYCHOLOGY_SPECIALTIES = [
  'Psicologia Escolar/Educacional',
  'Psicologia Organizacional e do Trabalho',
  'Psicologia de Trânsito',
  'Psicologia Jurídica',
  'Psicologia do Esporte',
  'Psicologia Clínica',
  'Psicologia Hospitalar',
  'Psicopedagogia',
  'Psicomotricidade',
  'Psicologia Social',
  'Neuropsicologia',
  'Psicologia em Saúde',
  'Avaliação Psicológica',
] as const;

export type PsychologySpecialty = (typeof PSYCHOLOGY_SPECIALTIES)[number];
