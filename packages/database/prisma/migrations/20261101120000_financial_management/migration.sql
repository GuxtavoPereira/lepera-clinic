CREATE TYPE "FinancialStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'INSURANCE', 'OTHER');

ALTER TABLE "financial_transactions"
  ADD COLUMN "status" "FinancialStatus" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "dueDate" DATE,
  ADD COLUMN "paidAt" DATE,
  ADD COLUMN "paymentMethod" "PaymentMethod",
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Outros',
  ADD COLUMN "cancelReason" TEXT;

-- Os registros anteriores representam pagamentos já realizados. Preservamos
-- valores e vínculos e usamos o dia civil da clínica para as datas legadas.
UPDATE "financial_transactions"
SET "dueDate" = ("transactionDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date,
    "paidAt" = ("transactionDate" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date;

ALTER TABLE "financial_transactions" ALTER COLUMN "dueDate" SET NOT NULL;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_paid_date" CHECK ("status" <> 'PAID' OR "paidAt" IS NOT NULL);
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_income_appointment" CHECK ("appointmentId" IS NULL OR "type" = 'INCOME');
CREATE INDEX "financial_transactions_dueDate_type_status_idx" ON "financial_transactions"("dueDate", "type", "status");
