export type FinancialType = "INCOME" | "EXPENSE";
export type FinancialStatus = "PENDING" | "PAID" | "CANCELLED";
export type FinancialDisplayStatus = FinancialStatus | "OVERDUE";
export type FinancialPaymentMethod =
  | "PIX"
  | "CASH"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "BANK_TRANSFER"
  | "INSURANCE"
  | "OTHER";

export type FinancialAppointment = {
  id: string;
  startDatetime: string;
  status: string;
  patientName: string;
  doctorName: string;
};

export type FinancialEntry = {
  id: string;
  type: FinancialType;
  status: FinancialStatus;
  displayStatus: FinancialDisplayStatus;
  amount: string;
  description: string;
  category: string;
  dueDate: string; // AAAA-MM-DD, sem conversão pelo fuso do navegador
  paidAt: string | null; // AAAA-MM-DD
  paymentMethod: FinancialPaymentMethod | null;
  cancelReason: string | null;
  appointmentId: string | null;
  appointment: FinancialAppointment | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type FinancialPage<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type FinancialSummary = {
  incomePaid: string;
  expensePaid: string;
  incomePending: string;
  expensePending: string;
  incomeOverdue: string;
  expenseOverdue: string;
  balance: string;
  totalCount: number;
};

export type FinancialCreateInput = {
  type: FinancialType;
  amount: string;
  description: string;
  category: string;
  dueDate: string;
  appointmentId?: string;
};

export type FinancialSettleInput = {
  paidAt: string;
  paymentMethod: FinancialPaymentMethod;
  expectedUpdatedAt: string;
};
