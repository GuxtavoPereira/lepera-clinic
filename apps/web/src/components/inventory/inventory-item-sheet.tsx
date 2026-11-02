"use client";

import { useRef, useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { InventoryItem } from "./inventory-types";

type Errors = Partial<Record<"name" | "minimumStock" | "description", string>>;

export function InventoryItemSheet({
  initial,
  onClose,
  onSaved,
}: {
  initial: InventoryItem | null;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [minimumStock, setMinimumStock] = useState(
    String(initial?.minimumStock ?? 5),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const failure = useRef<HTMLParagraphElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const next: Errors = {};
    if (name.trim().length < 3)
      next.name = "Informe um nome com pelo menos 3 caracteres.";
    if (description.trim().length > 500)
      next.description = "Use no máximo 500 caracteres.";
    const minimum = Number(minimumStock);
    if (
      !/^\d+$/.test(minimumStock) ||
      !Number.isInteger(minimum) ||
      minimum > 1_000_000
    )
      next.minimumStock = "Informe um número inteiro entre 0 e 1.000.000.";
    setErrors(next);
    setError(null);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus(),
      );
      return;
    }
    setSaving(true);
    try {
      const item = await apiFetch<InventoryItem>(
        initial ? `/inventory/items/${initial.id}` : "/inventory/items",
        {
          method: initial ? "PATCH" : "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            minimumStock: minimum,
          }),
        },
      );
      onSaved(item);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível salvar o item.",
      );
      requestAnimationFrame(() => failure.current?.focus());
    } finally {
      setSaving(false);
    }
  }

  const aria = (field: keyof Errors) => ({
    "aria-invalid": !!errors[field],
    "aria-describedby": errors[field] ? `inventory-${field}-error` : undefined,
  });
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <SheetContent className="data-[side=right]:w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle>
            {initial ? "Editar material" : "Novo material"}
          </SheetTitle>
          <SheetDescription>
            {initial
              ? "Altere os dados do material. O saldo é atualizado somente por movimentações."
              : "O material começa com saldo zero. Depois, registre uma entrada para incluir as unidades existentes."}
          </SheetDescription>
        </SheetHeader>
        <form
          ref={form}
          noValidate
          onSubmit={(event) => void submit(event)}
          className="space-y-5 px-6 pb-6"
        >
          <fieldset disabled={saving} className="space-y-5 disabled:opacity-60">
            <FormField
              id="inventory-name"
              label="Nome do material *"
              error={errors.name}
            >
              <input
                id="inventory-name"
                className={inputClassName}
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                {...aria("name")}
                required
              />
            </FormField>
            <FormField
              id="inventory-description"
              label="Descrição"
              error={errors.description}
            >
              <textarea
                id="inventory-description"
                className={textareaClassName}
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                {...aria("description")}
              />
            </FormField>
            <FormField
              id="inventory-minimumStock"
              label="Estoque mínimo (unidades) *"
              hint="O alerta aparece quando o saldo chega a esse número ou fica abaixo dele."
              error={errors.minimumStock}
            >
              <input
                id="inventory-minimumStock"
                className={inputClassName}
                type="number"
                min={0}
                max={1000000}
                step={1}
                value={minimumStock}
                onChange={(e) => setMinimumStock(e.target.value)}
                {...aria("minimumStock")}
                required
              />
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
              className="min-h-11"
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
            >
              Voltar
            </Button>
            <Button className="min-h-11" type="submit" disabled={saving}>
              {saving
                ? "Salvando…"
                : initial
                  ? "Salvar alterações"
                  : "Cadastrar material"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
