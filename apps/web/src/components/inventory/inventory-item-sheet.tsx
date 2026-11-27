"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  psychologicalTestMaterials,
  testMaterialLabels,
  type InventoryCategory,
  type PsychologicalTestMaterial,
} from "@lepera/contracts";
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

type Errors = Partial<Record<"name" | "minimumStock" | "description" | "testEdition" | "testMaterial", string>>;

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
  const [category, setCategory] = useState<InventoryCategory>(initial?.category ?? "GENERAL");
  const [testEdition, setTestEdition] = useState(initial?.testEdition ?? "");
  const [testMaterial, setTestMaterial] = useState<PsychologicalTestMaterial | "">(initial?.testMaterial ?? "");
  const isTest = category === "PSYCHOLOGICAL_TEST";
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
    if (isTest && !testEdition.trim()) next.testEdition = "Informe a edição ou versão.";
    if (isTest && !testMaterial) next.testMaterial = "Escolha o material contado no estoque.";
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
            category,
            ...(isTest ? { testEdition: testEdition.trim(), testMaterial } : {}),
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
            <FormField id="inventory-category" label="Categoria">
              <select
                id="inventory-category"
                className={inputClassName}
                value={category}
                onChange={(e) => {
                  const nextCategory = e.target.value as InventoryCategory;
                  setCategory(nextCategory);
                  if (nextCategory === "GENERAL") {
                    setErrors((prev) => ({
                      ...prev,
                      testEdition: undefined,
                      testMaterial: undefined,
                    }));
                  }
                }}
              >
                <option value="GENERAL">Material geral</option>
                <option value="PSYCHOLOGICAL_TEST">Teste psicológico</option>
              </select>
            </FormField>
            <FormField
              id="inventory-name"
              label={isTest ? "Nome do teste psicológico *" : "Nome do material *"}
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
            {isTest && <>
              <FormField id="inventory-testEdition" label="Edição ou versão *" error={errors.testEdition}>
                <input id="inventory-testEdition" className={inputClassName} maxLength={80} value={testEdition}
                  onChange={(e) => setTestEdition(e.target.value)} {...aria("testEdition")} required />
              </FormField>
              <FormField id="inventory-testMaterial" label="Material contado por unidade *" error={errors.testMaterial}>
                <select id="inventory-testMaterial" className={inputClassName} value={testMaterial}
                  onChange={(e) => setTestMaterial(e.target.value as PsychologicalTestMaterial | "")}
                  {...aria("testMaterial")} required>
                  <option value="">Selecione o material</option>
                  {psychologicalTestMaterials.map((type) => <option key={type} value={type}>{testMaterialLabels[type]}</option>)}
                </select>
              </FormField>
            </>}
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
