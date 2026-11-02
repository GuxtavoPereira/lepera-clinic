"use client";

import { useRef, useState, type FormEvent } from "react";
import type {
  FinancialAppointment,
  FinancialCreateInput,
  FinancialEntry,
  FinancialType,
} from "@lepera/contracts";
import { apiFetch } from "@/lib/api-client";
import { FormField, inputClassName } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppointmentPicker } from "./appointment-picker";
import { clinicToday, parseAmount } from "./financial-utils";

type Errors = Partial<
  Record<"amount" | "description" | "category" | "dueDate", string>
>;

export function FinancialEntrySheet({
  initial,
  canExpense,
  onClose,
  onSaved,
}: {
  initial: FinancialEntry | null;
  canExpense: boolean;
  onClose: () => void;
  onSaved: (entry: FinancialEntry) => void;
}) {
  const [type, setType] = useState<FinancialType>(initial?.type ?? "INCOME");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount.replace(".", ",") ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Consultas");
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? clinicToday());
  const [appointment, setAppointment] = useState<FinancialAppointment | null>(
    initial?.appointment ?? null,
  );
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const failure = useRef<HTMLParagraphElement>(null);

  function selectAppointment(value: FinancialAppointment | null) {
    setAppointment(value);
    if (value && !description.trim())
      setDescription(`Consulta de ${value.patientName}`.slice(0, 200));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const normalized = parseAmount(amount);
    const next: Errors = {};
    if (!normalized)
      next.amount =
        "Informe um valor maior que zero, com até 8 dígitos e 2 casas decimais.";
    if (description.trim().length < 3)
      next.description = "Descreva o lançamento com pelo menos 3 caracteres.";
    if (!category.trim()) next.category = "Informe uma categoria.";
    const date = new Date(`${dueDate}T00:00:00Z`);
    if (
      !dueDate ||
      !Number.isFinite(date.getTime()) ||
      date.toISOString().slice(0, 10) !== dueDate ||
      dueDate < "1900-01-01"
    )
      next.dueDate = "Informe uma data válida.";
    setErrors(next);
    setError(null);
    if (Object.keys(next).length || !normalized) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    setSaving(true);
    const fields = {
      amount: normalized,
      description: description.trim(),
      category: category.trim(),
      dueDate,
    };
    const payload: FinancialCreateInput = {
      ...fields,
      type,
      ...(appointment ? { appointmentId: appointment.id } : {}),
    };
    try {
      const result = await apiFetch<FinancialEntry>(
        initial ? `/financial/${initial.id}` : "/financial",
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify(
            initial
              ? { ...fields, expectedUpdatedAt: initial.updatedAt }
              : payload,
          ),
        },
      );
      onSaved(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o lançamento.",
      );
      requestAnimationFrame(() => failure.current?.focus());
    } finally {
      setSaving(false);
    }
  }

  const aria = (field: keyof Errors) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `${field}-error` : undefined,
  });

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <SheetContent className="data-[side=right]:w-full overflow-y-auto data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle>
            {initial ? "Editar lançamento" : "Novo lançamento"}
          </SheetTitle>
          <SheetDescription>
            {initial
              ? "Apenas lançamentos pendentes podem ser editados."
              : "Cadastre a pendência. Depois, registre a quitação quando o pagamento for confirmado."}
          </SheetDescription>
        </SheetHeader>
        <form
          ref={form}
          noValidate
          onSubmit={(event) => void submit(event)}
          className="space-y-5 px-6 pb-6"
        >
          <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
            <FormField id="financial-type" label="Tipo de lançamento">
              <select
                id="financial-type"
                className={inputClassName}
                value={type}
                disabled={!!initial || !canExpense}
                onChange={(event) => {
                  const next = event.target.value as FinancialType;
                  setType(next);
                  setAppointment(null);
                  setCategory(next === "INCOME" ? "Consultas" : "Estrutura");
                }}
              >
                <option value="INCOME">Receita / cobrança</option>
                {canExpense ? (
                  <option value="EXPENSE">Despesa / conta a pagar</option>
                ) : null}
              </select>
            </FormField>
            {!initial && type === "INCOME" ? (
              <AppointmentPicker
                value={appointment}
                onChange={selectAppointment}
              />
            ) : null}
            {initial?.appointment ? (
              <p className="rounded-lg bg-muted p-3 text-sm">
                Consulta vinculada: {initial.appointment.patientName}. O vínculo
                é preservado.
              </p>
            ) : null}
            <FormField
              id="description"
              label="Descrição *"
              error={errors.description}
            >
              <input
                id="description"
                className={inputClassName}
                value={description}
                maxLength={200}
                onChange={(e) => setDescription(e.target.value)}
                {...aria("description")}
                required
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="amount"
                label="Valor (R$) *"
                hint="Ex.: 180,00"
                error={errors.amount}
              >
                <input
                  id="amount"
                  className={inputClassName}
                  value={amount}
                  inputMode="decimal"
                  maxLength={16}
                  onChange={(e) => setAmount(e.target.value)}
                  {...aria("amount")}
                  required
                />
              </FormField>
              <FormField
                id="dueDate"
                label="Vencimento *"
                error={errors.dueDate}
              >
                <input
                  id="dueDate"
                  type="date"
                  min="1900-01-01"
                  className={inputClassName}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  {...aria("dueDate")}
                  required
                />
              </FormField>
            </div>
            <FormField
              id="category"
              label="Categoria *"
              error={errors.category}
            >
              <input
                id="category"
                className={inputClassName}
                list="financial-categories"
                value={category}
                maxLength={60}
                onChange={(e) => setCategory(e.target.value)}
                {...aria("category")}
                required
              />
              <datalist id="financial-categories">
                {(type === "INCOME"
                  ? ["Consultas", "Avaliações", "Convênios", "Outros"]
                  : ["Estrutura", "Materiais", "Serviços", "Pessoal", "Outros"]
                ).map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </FormField>
          </fieldset>
          {error ? (
            <p
              ref={failure}
              tabIndex={-1}
              role="alert"
              className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Voltar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando…"
                : initial
                  ? "Salvar alterações"
                  : "Cadastrar pendência"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
