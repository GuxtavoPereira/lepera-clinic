"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RegistrationFields,
  RegistrationProgress,
  registrationPayload,
} from "@/components/forms/registration-fields";
import { useRegistrationWizard } from "@/components/forms/use-registration-wizard";
import { apiFetch } from "@/lib/api-client";
import type { RegistrationStep } from "@/lib/registration-validation";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};
export function NewPatientSheet({ open, onOpenChange, onCreated }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
        {open && (
          <NewPatientForm onOpenChange={onOpenChange} onCreated={onCreated} />
        )}
      </SheetContent>
    </Sheet>
  );
}
function NewPatientForm({ onOpenChange, onCreated }: Omit<Props, "open">) {
  const wizard = useRegistrationWizard("new-patient");
  const [saving, setSaving] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    if (wizard.step < 3) {
      if (wizard.validate(wizard.step))
        wizard.goToStep((wizard.step + 1) as RegistrationStep);
      return;
    }
    if (!wizard.validate()) return;
    setSaving(true);
    try {
      await apiFetch("/patients", {
        method: "POST",
        body: JSON.stringify(registrationPayload(wizard.form)),
      });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      wizard.handleApiError(
        err,
        "Não foi possível cadastrar o paciente. Seus dados foram mantidos; tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} noValidate className="flex h-full min-h-0 flex-col">
      <SheetHeader className="shrink-0 pr-12">
        <SheetTitle>Novo paciente</SheetTitle>
        <SheetDescription>
          Preencha o cadastro em três etapas. Você pode voltar sem perder os
          dados.
        </SheetDescription>
      </SheetHeader>
      <div className="shrink-0 border-b border-border px-4 pb-4">
        <RegistrationProgress step={wizard.step} />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        <RegistrationFields
          value={wizard.form}
          onChange={wizard.update}
          prefix="new-patient"
          step={wizard.step}
          errors={wizard.errors}
        />
        {wizard.generalError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
          >
            {wizard.generalError}
          </p>
        )}
      </div>
      <SheetFooter className="shrink-0 flex-row justify-between gap-3 border-t border-border bg-popover">
        <Button
          type="button"
          variant="outline"
          className="min-h-11"
          disabled={saving}
          onClick={() =>
            wizard.step === 1
              ? onOpenChange(false)
              : wizard.goToStep((wizard.step - 1) as RegistrationStep)
          }
        >
          {wizard.step > 1 && <ArrowLeft className="size-4" />}
          {wizard.step === 1 ? "Cancelar" : "Voltar"}
        </Button>
        <Button type="submit" disabled={saving} className="min-h-11">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {wizard.step < 3 ? (
            <>
              Continuar
              <ArrowRight className="size-4" />
            </>
          ) : (
            "Cadastrar paciente"
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}
