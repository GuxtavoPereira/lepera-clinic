export type InventoryItem = {
  id: string;
  name: string;
  description: string | null;
  stockQuantity: number;
  minimumStock: number;
  createdAt: string;
  updatedAt: string;
};

export type InventoryPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type InventorySummary = {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalUnits: number;
};

export type StockMovement = {
  id: string;
  movementType: "ENTRY" | "EXIT";
  quantity: number;
  justification: string | null;
  createdAt: string;
  user: { name: string };
};

export type MovementHistory = InventoryPage<StockMovement> & {
  item: InventoryItem;
};

export const stockDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

export function stockStatus(item: InventoryItem) {
  if (item.stockQuantity === 0) return "Sem estoque";
  if (item.stockQuantity <= item.minimumStock) return "Repor material";
  return "Em dia";
}
