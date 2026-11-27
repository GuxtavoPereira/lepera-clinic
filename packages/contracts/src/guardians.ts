export const guardianLinkStatuses = ["ACTIVE", "REVOKED"] as const;
export type GuardianLinkStatus = (typeof guardianLinkStatuses)[number];

export const guardianLinkStatusLabels: Record<GuardianLinkStatus, string> = {
  ACTIVE: "Ativo",
  REVOKED: "Revogado",
};

export const guardianRelationshipSuggestions = [
  "Mãe",
  "Pai",
  "Avó / Avô",
  "Tutor(a) legal",
  "Outro responsável legal",
] as const;
