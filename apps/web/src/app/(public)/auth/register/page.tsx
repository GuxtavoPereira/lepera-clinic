"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  RegistrationFields,
  RegistrationProgress,
  registrationPayload,
} from "@/components/forms/registration-fields";
import { useRegistrationWizard } from "@/components/forms/use-registration-wizard";
import { registerPatient } from "@/lib/auth";
import type { RegistrationStep } from "@/lib/registration-validation";
import { clearPreview, requestedSlotPath } from "@/lib/google-preview";

export default function RegisterPage() {
  const router = useRouter();
  const wizard = useRegistrationWizard("register");
  const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (wizard.step < 3) {
      if (wizard.validate(wizard.step))
        wizard.goToStep((wizard.step + 1) as RegistrationStep);
      return;
    }
    if (!wizard.validate()) return;
    setSubmitting(true);
    try {
      await registerPatient(registrationPayload(wizard.form));
      const next = requestedSlotPath();
      clearPreview();
      router.push(next);
    } catch (err) {
      wizard.handleApiError(
        err,
        "Não foi possível concluir o cadastro. Seus dados foram mantidos; tente novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="container mx-auto max-w-xl px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-foreground">Criar conta</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cadastro de paciente da Leperapia Clinic.
        </p>
      </div>
      <form
        onSubmit={submit}
        noValidate
        className="space-y-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6"
      >
        <RegistrationProgress step={wizard.step} />
        <RegistrationFields
          value={wizard.form}
          onChange={wizard.update}
          prefix="register"
          step={wizard.step}
          errors={wizard.errors}
          internal={false}
        />
        {wizard.generalError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
          >
            {wizard.generalError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
          {wizard.step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() =>
                wizard.goToStep((wizard.step - 1) as RegistrationStep)
              }
              disabled={submitting}
            >
              <ArrowLeft className="size-4" />
              Voltar
            </Button>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground transition hover:text-foreground"
            >
              Já tenho conta
            </Link>
          )}
          <Button type="submit" className="min-h-11" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {wizard.step < 3 ? (
              <>
                Continuar
                <ArrowRight className="size-4" />
              </>
            ) : (
              "Concluir cadastro"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
