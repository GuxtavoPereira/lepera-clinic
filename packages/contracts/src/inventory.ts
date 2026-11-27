export const inventoryCategories = ["GENERAL", "PSYCHOLOGICAL_TEST"] as const;
export type InventoryCategory = (typeof inventoryCategories)[number];

export const psychologicalTestMaterials = [
  "KIT", "MANUAL", "BOOKLET", "PROTOCOL", "RESPONSE_SHEET",
] as const;
export type PsychologicalTestMaterial = (typeof psychologicalTestMaterials)[number];

export const testMaterialLabels: Record<PsychologicalTestMaterial, string> = {
  KIT: "Kit",
  MANUAL: "Manual",
  BOOKLET: "Caderno",
  PROTOCOL: "Protocolo",
  RESPONSE_SHEET: "Folha de respostas",
};
