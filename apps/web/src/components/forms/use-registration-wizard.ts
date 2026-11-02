"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api-client";
import {
  EMPTY_REGISTRATION,
  registrationErrors,
  registrationStepForField,
  type RegistrationErrors,
  type RegistrationField,
  type RegistrationForm,
  type RegistrationStep,
} from "@/lib/registration-validation";

export function useRegistrationWizard(
  prefix: string,
  patient = true,
  initial: RegistrationForm = EMPTY_REGISTRATION,
) {
  const [form, setForm] = useState(initial);
  const [step, setStep] = useState<RegistrationStep>(1);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<{
    field: RegistrationField;
    request: number;
  } | null>(null);

  useEffect(() => {
    if (!focusTarget) return;
    const input = document.getElementById(`${prefix}-${focusTarget.field}`);
    input?.focus();
    input?.scrollIntoView({ block: "nearest" });
  }, [focusTarget, prefix, step]);

  function update(patch: Partial<RegistrationForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch) as (keyof RegistrationForm)[])
        delete next[key];
      if ("password" in patch) delete next.confirmPassword;
      return next;
    });
    setGeneralError(null);
  }
  function clearFieldError(field: RegistrationField) {
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
    setGeneralError(null);
  }
  function showErrors(next: RegistrationErrors) {
    setErrors(next);
    const field = (Object.keys(next) as RegistrationField[]).find(
      (key) => !!next[key],
    );
    if (!field) return true;
    setStep(registrationStepForField(field));
    setFocusTarget((current) => ({
      field,
      request: (current?.request ?? 0) + 1,
    }));
    return false;
  }
  function validate(target?: RegistrationStep, extra: RegistrationErrors = {}) {
    setGeneralError(null);
    return showErrors({
      ...registrationErrors(form, patient, target),
      ...extra,
    });
  }
  function goToStep(next: RegistrationStep) {
    setGeneralError(null);
    setStep(next);
  }
  function handleApiError(error: unknown, fallback: string) {
    const message = error instanceof ApiError ? error.message : fallback;
    setGeneralError(message);
    if (!(error instanceof ApiError)) return;
    if (error.status === 409) {
      showErrors({
        email:
          "Confira o e-mail: já pode existir uma conta com este e-mail ou CPF.",
        cpf: "Confira o CPF: já pode existir uma conta com este e-mail ou CPF.",
      });
    } else if (error.status === 400) {
      const field = /cpf/i.test(message)
        ? "cpf"
        : /e-?mail/i.test(message)
          ? "email"
          : /nascimento|birthDate/i.test(message)
            ? "birthDate"
            : /senha|password/i.test(message)
              ? "password"
              : undefined;
      if (field) showErrors({ [field]: message });
    }
  }
  return {
    form,
    step,
    errors,
    generalError,
    update,
    validate,
    showErrors,
    goToStep,
    handleApiError,
    setGeneralError,
    clearFieldError,
  };
}
