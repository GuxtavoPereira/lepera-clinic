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
import {
  stockDate,
  type InventoryItem,
  type MovementHistory,
} from "./inventory-types";
import { useInventoryResource } from "./use-inventory-resource";

export type StockSheetMode = "history" | "ENTRY" | "EXIT";

export function StockMovementSheet({
  item,
  initialMode,
  onClose,
  onSaved,
}: {
  item: InventoryItem;
  initialMode: StockSheetMode;
  onClose: () => void;
  onSaved: (item: InventoryItem) => void;
}) {
  const [mode, setMode] = useState(initialMode);
  const [quantity, setQuantity] = useState("");
  const [justification, setJustification] = useState("");
  const [errors, setErrors] = useState<{
    quantity?: string;
    justification?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const history = useInventoryResource<MovementHistory>(
    `/inventory/items/${item.id}/movements?page=${page}&pageSize=10`,
    retry,
  );
  const current = history.data?.item ?? item;
  const form = useRef<HTMLFormElement>(null);
  const failure = useRef<HTMLParagraphElement>(null);

  function chooseMode(next: StockSheetMode) {
    setMode(next);
    setErrors({});
    setError(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || mode === "history") return;
    const next: typeof errors = {};
    const units = Number(quantity);
    if (
      !/^\d+$/.test(quantity) ||
      !Number.isInteger(units) ||
      units < 1 ||
      units > 1_000_000
    )
      next.quantity = "Informe de 1 a 1.000.000 unidades inteiras.";
    else if (mode === "EXIT" && units > current.stockQuantity)
      next.quantity = `Saldo disponível: ${current.stockQuantity} unidades. Atualize se houver outra movimentação.`;
    if (justification.trim().length < 3)
      next.justification = "Explique o motivo com pelo menos 3 caracteres.";
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
      const result = await apiFetch<InventoryItem>(
        `/inventory/items/${item.id}/movements`,
        {
          method: "POST",
          body: JSON.stringify({
            movementType: mode,
            quantity: units,
            justification: justification.trim(),
          }),
        },
      );
      onSaved(result);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível registrar a movimentação.",
      );
      setRetry((n) => n + 1);
      requestAnimationFrame(() => failure.current?.focus());
    } finally {
      setSaving(false);
    }
  }

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
            {mode === "history"
              ? "Histórico do material"
              : mode === "ENTRY"
                ? "Registrar entrada"
                : "Registrar saída"}
          </SheetTitle>
          <SheetDescription>
            {current.name} · Saldo atual: {current.stockQuantity} unidades ·
            Mínimo: {current.minimumStock}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-6 pb-6">
          <nav aria-label="Ações do material" className="flex flex-wrap gap-2">
            {(
              [
                ["history", "Histórico"],
                ["ENTRY", "Entrada"],
                ["EXIT", "Saída"],
              ] as const
            ).map(([value, label]) => (
              <Button
                className="min-h-11"
                key={value}
                type="button"
                variant={mode === value ? "default" : "outline"}
                aria-pressed={mode === value}
                disabled={saving}
                onClick={() => chooseMode(value)}
              >
                {label}
              </Button>
            ))}
            <Button
              className="min-h-11"
              type="button"
              variant="ghost"
              disabled={saving || history.loading}
              onClick={() => setRetry((n) => n + 1)}
            >
              Atualizar saldo
            </Button>
          </nav>
          {history.error ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
            >
              {history.error} Use “Atualizar saldo” para tentar novamente.
            </p>
          ) : null}
          {mode === "history" ? (
            <section
              aria-label="Movimentações registradas"
              className="space-y-4"
            >
              <p className="text-xs text-muted-foreground">
                Datas no horário de Brasília. Movimentações anteriores são
                preservadas; para corrigir um saldo, registre uma nova
                movimentação com o motivo.
              </p>
              {history.loading ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Carregando histórico…
                </p>
              ) : null}
              {history.data ? (
                <>
                  <ul className="space-y-3">
                    {history.data.items.map((movement) => (
                      <li
                        key={movement.id}
                        className="space-y-2 rounded-xl border border-border p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-2">
                          <span
                            className={
                              movement.movementType === "ENTRY"
                                ? "font-medium text-primary"
                                : "font-medium text-foreground"
                            }
                          >
                            {movement.movementType === "ENTRY" ? "+" : "−"}
                            {movement.quantity} ·{" "}
                            {movement.movementType === "ENTRY"
                              ? "Entrada"
                              : "Saída"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stockDate(movement.createdAt)}
                          </span>
                        </div>
                        <p className="break-words text-sm">
                          {movement.justification ||
                            "Sem justificativa (registro anterior)"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Registrado por {movement.user.name}
                        </p>
                      </li>
                    ))}
                  </ul>
                  {history.data.total === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                      Este material ainda não possui movimentações.
                    </p>
                  ) : null}
                  {history.data.totalPages > 1 ? (
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <Button
                        className="min-h-11"
                        type="button"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage((n) => n - 1)}
                      >
                        Anterior
                      </Button>
                      <span>
                        {history.data.page} de {history.data.totalPages}
                      </span>
                      <Button
                        className="min-h-11"
                        type="button"
                        variant="outline"
                        disabled={page >= history.data.totalPages}
                        onClick={() => setPage((n) => n + 1)}
                      >
                        Próxima
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </section>
          ) : (
            <form
              ref={form}
              noValidate
              onSubmit={(event) => void submit(event)}
              className="space-y-5"
            >
              <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                {mode === "ENTRY"
                  ? "Use para reposições, compras e correções que aumentam o saldo."
                  : "Use para consumo e correções que reduzem o saldo. A saída não pode superar o estoque disponível."}
              </p>
              <fieldset
                disabled={saving}
                className="space-y-4 disabled:opacity-60"
              >
                <FormField
                  id="stock-quantity"
                  label="Quantidade (unidades) *"
                  error={errors.quantity}
                >
                  <input
                    id="stock-quantity"
                    type="number"
                    min={1}
                    max={1000000}
                    step={1}
                    className={inputClassName}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    aria-invalid={!!errors.quantity}
                    aria-describedby={
                      errors.quantity ? "stock-quantity-error" : undefined
                    }
                    required
                  />
                </FormField>
                <FormField
                  id="stock-justification"
                  label="Motivo *"
                  hint="Ex.: reposição do fornecedor ou consumo nos consultórios."
                  error={errors.justification}
                >
                  <textarea
                    id="stock-justification"
                    className={textareaClassName}
                    maxLength={300}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    aria-invalid={!!errors.justification}
                    aria-describedby={
                      errors.justification
                        ? "stock-justification-error"
                        : undefined
                    }
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
                    ? "Registrando…"
                    : mode === "ENTRY"
                      ? "Confirmar entrada"
                      : "Confirmar saída"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
