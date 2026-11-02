"use client";

import { useRef, useState, type FormEvent } from "react";
import type { FinancialEntry, FinancialPaymentMethod } from "@lepera/contracts";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  FormField,
  inputClassName,
  textareaClassName,
} from "@/components/forms/form-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  appointmentDate,
  civilDate,
  clinicToday,
  money,
  paymentLabels,
  statusLabels,
} from "./financial-utils";

export function FinancialActionSheet({
  entry,
  isAdmin,
  onClose,
  onEdit,
  onSaved,
}: {
  entry: FinancialEntry;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSaved: (message: string) => void;
}) {
  const [action, setAction] = useState<
    "details" | "settle" | "cancel" | "reopen"
  >("details");
  const [paidAt, setPaidAt] = useState(clinicToday());
  const [paymentMethod, setPaymentMethod] =
    useState<FinancialPaymentMethod>("PIX");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const failure = useRef<HTMLParagraphElement>(null);
  const isIncome = entry.type === "INCOME";
  const reversing = action === "cancel" && entry.status === "PAID";
  const title =
    action === "settle"
      ? isIncome
        ? "Registrar recebimento"
        : "Registrar pagamento"
      : action === "cancel"
        ? reversing
          ? "Estornar registro"
          : "Cancelar lançamento"
        : action === "reopen"
          ? "Reabrir pendência"
          : "Detalhes do lançamento";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving || action === "details") return;
    const next: Record<string, string> = {};
    if (action === "settle") {
      const date = new Date(`${paidAt}T00:00:00Z`);
      if (
        !paidAt ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== paidAt ||
        paidAt < "1900-01-01" ||
        paidAt > clinicToday()
      )
        next.paidAt =
          "Informe uma data válida até hoje, no horário de Brasília.";
    }
    if (action === "cancel" && reason.trim().length < 3)
      next.reason = "Explique o motivo com pelo menos 3 caracteres.";
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
      await apiFetch<FinancialEntry>(`/financial/${entry.id}/${action}`, {
        method: "PATCH",
        body: JSON.stringify(
          action === "settle"
            ? { paidAt, paymentMethod, expectedUpdatedAt: entry.updatedAt }
            : action === "cancel"
              ? { reason: reason.trim(), expectedUpdatedAt: entry.updatedAt }
              : { expectedUpdatedAt: entry.updatedAt },
        ),
      });
      onSaved(
        action === "settle"
          ? "Quitação registrada com sucesso."
          : action === "cancel"
            ? reversing
              ? "Estorno do registro concluído. Confira separadamente qualquer devolução ao pagador."
              : "Lançamento cancelado."
            : "Lançamento reaberto como pendente.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não foi possível concluir a operação.",
      );
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
      <SheetContent className="data-[side=right]:w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
        <SheetHeader className="border-b border-border p-6">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{entry.description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-6 pb-6">
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">
              {isIncome ? "Receita" : "Despesa"} · {entry.category}
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {money(entry.amount)}
            </p>
            <p className="mt-2 text-sm">
              {statusLabels[entry.displayStatus]} · Vencimento{" "}
              {civilDate(entry.dueDate)}
            </p>
          </div>
          {action === "details" ? (
            <>
              <dl className="space-y-4 text-sm">
                {entry.paidAt ? (
                  <div>
                    <dt className="text-muted-foreground">Data de quitação</dt>
                    <dd>{civilDate(entry.paidAt)}</dd>
                  </div>
                ) : null}
                {entry.paymentMethod ? (
                  <div>
                    <dt className="text-muted-foreground">
                      Forma de pagamento
                    </dt>
                    <dd>{paymentLabels[entry.paymentMethod]}</dd>
                  </div>
                ) : null}
                {entry.appointment ? (
                  <div>
                    <dt className="text-muted-foreground">
                      Consulta vinculada
                    </dt>
                    <dd className="mt-1">
                      {entry.appointment.patientName}
                      <br />
                      {appointmentDate(entry.appointment.startDatetime)}
                      <br />
                      {entry.appointment.doctorName}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">Registrado por</dt>
                  <dd>{entry.createdBy}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Criação</dt>
                  <dd>{appointmentDate(entry.createdAt)}</dd>
                </div>
                {entry.cancelReason ? (
                  <div>
                    <dt className="text-muted-foreground">
                      Motivo do cancelamento / estorno
                    </dt>
                    <dd className="whitespace-pre-wrap break-words">
                      {entry.cancelReason}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">Identificador</dt>
                  <dd className="break-all font-mono text-xs">{entry.id}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                {entry.status === "PENDING" ? (
                  <>
                    <Button type="button" onClick={() => setAction("settle")}>
                      {isIncome
                        ? "Registrar recebimento"
                        : "Registrar pagamento"}
                    </Button>
                    <Button type="button" variant="outline" onClick={onEdit}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAction("cancel")}
                    >
                      Cancelar lançamento
                    </Button>
                  </>
                ) : null}
                {entry.status === "PAID" && isAdmin ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAction("cancel")}
                  >
                    Estornar registro
                  </Button>
                ) : null}
                {entry.status === "CANCELLED" && isAdmin ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAction("reopen")}
                  >
                    Reabrir pendência
                  </Button>
                ) : null}
              </div>
            </>
          ) : (
            <form
              ref={form}
              noValidate
              onSubmit={(event) => void submit(event)}
              className="space-y-5"
            >
              <fieldset disabled={saving} className="space-y-5">
                {action === "settle" ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Registre somente após confirmar o pagamento integral de{" "}
                      {money(entry.amount)}.
                    </p>
                    <FormField
                      id="paidAt"
                      label="Data de quitação *"
                      error={errors.paidAt}
                    >
                      <input
                        id="paidAt"
                        type="date"
                        min="1900-01-01"
                        max={clinicToday()}
                        value={paidAt}
                        onChange={(e) => setPaidAt(e.target.value)}
                        className={inputClassName}
                        aria-invalid={!!errors.paidAt}
                        aria-describedby={
                          errors.paidAt ? "paidAt-error" : undefined
                        }
                        required
                      />
                    </FormField>
                    <FormField id="paymentMethod" label="Forma de pagamento *">
                      <select
                        id="paymentMethod"
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(
                            e.target.value as FinancialPaymentMethod,
                          )
                        }
                        className={inputClassName}
                      >
                        {Object.entries(paymentLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </>
                ) : null}
                {action === "cancel" ? (
                  <>
                    <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                      {reversing
                        ? "O valor será retirado dos totais financeiros, mantendo o histórico. Esta ação não devolve dinheiro por Pix, cartão ou banco; a devolução deve ser feita e conferida separadamente."
                        : "A pendência deixará de compor os totais. O histórico será preservado e a consulta vinculada continuará na agenda."}
                    </p>
                    <FormField
                      id="cancel-reason"
                      label="Motivo *"
                      error={errors.reason}
                    >
                      <textarea
                        id="cancel-reason"
                        className={textareaClassName}
                        value={reason}
                        maxLength={300}
                        onChange={(e) => setReason(e.target.value)}
                        aria-invalid={!!errors.reason}
                        aria-describedby={
                          errors.reason ? "cancel-reason-error" : undefined
                        }
                        required
                      />
                    </FormField>
                  </>
                ) : null}
                {action === "reopen" ? (
                  <p className="text-sm text-muted-foreground">
                    O lançamento voltará a ser pendente. A quitação anterior
                    será removida deste lançamento; a auditoria da operação será
                    preservada.
                  </p>
                ) : null}
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
                  onClick={() => {
                    setAction("details");
                    setError(null);
                    setErrors({});
                  }}
                >
                  Voltar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Registrando…" : "Confirmar"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
