import test from "node:test";
import assert from "node:assert/strict";
import { civilDate, financialCsv, monthRange, parseAmount } from "../src/components/financial/financial-utils.ts";

test("valores brasileiros e decimais preservam os centavos enviados à API", () => {
  for (const [input, result] of [["180,50", "180.50"], ["R$ 1.234,56", "1234.56"], ["0,01", "0.01"], ["10.5", "10.50"], ["99999999,99", "99999999.99"]]) {
    assert.equal(parseAmount(input), result);
  }
});

test("rejeita valores vazios, negativos, fora do limite e agrupamentos ambíguos", () => {
  for (const input of ["", "0", "0,00", "-10", "1e3", "100000000", "10.123", "1.2.3,45", "1,234", "NaN", "1,2,3", "0.10,00"]) assert.equal(parseAmount(input), null, input);
});

test("data de vencimento é formatada sem mudar o dia pelo fuso", () => {
  assert.equal(civilDate("2026-11-02"), "02/11/2026");
});

test("intervalo mensal termina no último dia válido do mês", () => {
  for (const offset of [-12, -1, 0, 1, 12]) {
    const { from, to } = monthRange(offset);
    assert.equal(from.slice(-2), "01");
    assert.equal(from.slice(0, 7), to.slice(0, 7));
    assert.ok(new Date(`${to}T00:00:00Z`).getUTCDate() >= 28);
    const after = new Date(`${to}T00:00:00Z`); after.setUTCDate(after.getUTCDate() + 1);
    assert.equal(after.getUTCDate(), 1);
  }
});

function entry(description) {
  return { id: "test-id", type: "INCOME", description, category: "Consultas", amount: "180.50", status: "PENDING", displayStatus: "PENDING", dueDate: "2026-11-02", paidAt: null, paymentMethod: null, appointment: null, appointmentId: null, createdBy: "Demonstração", cancelReason: null, createdAt: "2026-11-02T12:00:00Z" };
}

test("CSV usa centavos brasileiros, aspas escapadas, BOM e cabeçalho", () => {
  const csv = financialCsv([entry('Consulta; "avaliação"\ncontinuação')]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"180,50"'));
  assert.ok(csv.includes('"Consulta; ""avaliação""\ncontinuação"'));
  assert.ok(csv.includes('"02/11/2026"'));
});

test("exportação neutraliza fórmulas de planilha em campos de texto", () => {
  for (const prefix of ["=", "+", "-", "@", "  =", "\t="]) {
    const csv = financialCsv([entry(`${prefix}COMANDO()`)]);
    assert.ok(csv.includes(`"'${prefix}COMANDO()"`));
  }
});
