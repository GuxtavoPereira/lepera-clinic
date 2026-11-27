export const guidanceMessageCategories = [
  "POST_SESSION",
  "CANCELLATION_NOTICE",
  "PREPARATION",
  "GENERAL",
] as const;

export type GuidanceMessageCategory =
  (typeof guidanceMessageCategories)[number];

export const guidanceMessageCategoryLabels: Record<
  GuidanceMessageCategory,
  string
> = {
  POST_SESSION: "Orientações pós-consulta",
  CANCELLATION_NOTICE: "Aviso de desmarcação",
  PREPARATION: "Preparação para sessão",
  GENERAL: "Orientação geral",
};
