"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
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
  EMPTY_REGISTRATION,
  registrationPayload,
  validateRegistration,
  type RegistrationForm,
} from "@/components/forms/registration-fields";
import { ApiError, apiFetch } from "@/lib/api-client";
type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};
export function NewPatientSheet({ open, onOpenChange, onCreated }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {open && (
          <NewPatientForm onOpenChange={onOpenChange} onCreated={onCreated} />
        )}
      </SheetContent>
    </Sheet>
  );
}
function NewPatientForm({ onOpenChange, onCreated }: Omit<Props, "open">) {
  const [form, setForm] = useState<RegistrationForm>(EMPTY_REGISTRATION);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const problem = validateRegistration(form);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/patients", {
        method: "POST",
        body: JSON.stringify(registrationPayload(form)),
      });
      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar o paciente.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex h-full flex-col">
      <SheetHeader>
        <SheetTitle>Novo paciente</SheetTitle>
        <SheetDescription>
          Dados de acesso, dados pessoais, contato de emergência e plano de
          saúde.
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
        <RegistrationFields
          value={form}
          onChange={(patch) => {
            setForm((current) => ({ ...current, ...patch }));
            setError(null);
          }}
          prefix="new-patient"
        />
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>
      <SheetFooter className="flex-row justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="size-4 animate-spin" />}Cadastrar
          paciente
        </Button>
      </SheetFooter>
    </form>
  );
}
