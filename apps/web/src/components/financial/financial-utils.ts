import type { FinancialEntry, FinancialPaymentMethod } from "@lepera/contracts";

export const paymentLabels: Record<FinancialPaymentMethod, string> = {
  PIX: "Pix",
  CASH: "Dinheiro",
  DEBIT_CARD: "Cartão de débito",
  CREDIT_CARD: "Cartão de crédito",
  BANK_TRANSFER: "Transferência",
  INSURANCE: "Convênio",
  OTHER: "Outro",
};

export const statusLabels = {
  PENDING: "Pendente",
  PAID: "Quitado",
  CANCELLED: "Cancelado",
  OVERDUE: "Em atraso",
} as const;

export function clinicToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function monthRange(offset = 0) {
  const today = clinicToday();
  const [year, month] = today.split("-").map(Number);
  const from = new Date(Date.UTC(year, month - 1 + offset, 1));
  const to = new Date(Date.UTC(year, month + offset, 0));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function money(amount: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(amount));
}

export function civilDate(date: string) {
  return date.slice(0, 10).split("-").reverse().join("/");
}

export function appointmentDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

/** Converte a escrita brasileira sem usar ponto flutuante para o valor enviado. */
export function parseAmount(value: string): string | null {
  const cleaned = value.trim().replace(/^R\$\s*/, "");
  if (
    cleaned.includes(",") &&
    !/^(?:0|[1-9]\d{0,7}|[1-9]\d{0,2}(?:\.\d{3})+),\d{1,2}$/.test(cleaned)
  )
    return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  if (!/[1-9]/.test(normalized)) return null;
  return `${whole}.${fraction.padEnd(2, "0")}`;
}

function csvCell(value: string) {
  // Impede fórmulas em planilhas, inclusive após espaços/caracteres de controle.
  const safe = /^[\s\u0000-\u001f]*[=+@-]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function financialCsv(items: FinancialEntry[]) {
  const rows = items.map((item) => [
    item.id,
    item.type === "INCOME" ? "Receita" : "Despesa",
    item.description,
    item.category,
    item.amount.replace(".", ","),
    statusLabels[item.displayStatus],
    civilDate(item.dueDate),
    item.paidAt ? civilDate(item.paidAt) : "",
    item.paymentMethod ? paymentLabels[item.paymentMethod] : "",
    item.appointment?.patientName ?? "",
    item.appointment?.doctorName ?? "",
    item.appointment ? appointmentDate(item.appointment.startDatetime) : "",
    item.createdBy,
    item.cancelReason ?? "",
  ]);
  return (
    "\uFEFF" +
    [
      [
        "ID",
        "Tipo",
        "Descrição",
        "Categoria",
        "Valor (R$)",
        "Situação",
        "Vencimento",
        "Quitação",
        "Forma de pagamento",
        "Paciente",
        "Profissional",
        "Consulta (Brasília)",
        "Registrado por",
        "Motivo do cancelamento",
      ],
      ...rows,
    ]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n")
  );
}
