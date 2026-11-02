"use client";

import { FormField, inputClassName } from "@/components/forms/form-field";
import { isUnder18, maskCpf, maskPhone } from "@/lib/br-format";
import type {
  RegistrationErrors,
  RegistrationForm,
  RegistrationStep,
} from "@/lib/registration-validation";
export {
  EMPTY_REGISTRATION,
  registrationPayload,
  validateRegistration,
  type RegistrationForm,
} from "@/lib/registration-validation";

type Field = {
  key: Exclude<keyof RegistrationForm, "consent">;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  hint?: string;
  autoComplete?: string;
  step: RegistrationStep;
};

export function RegistrationFields({
  value,
  onChange,
  patient = true,
  prefix = "registration",
  step,
  errors = {},
  internal = true,
}: {
  value: RegistrationForm;
  onChange: (patch: Partial<RegistrationForm>) => void;
  patient?: boolean;
  prefix?: string;
  step?: RegistrationStep;
  errors?: RegistrationErrors;
  internal?: boolean;
}) {
  const minor = isUnder18(value.birthDate);
  const fields: Field[] = [
    {
      key: "name",
      label: "Nome completo",
      required: true,
      maxLength: 120,
      autoComplete: "name",
      step: 1,
    },
    {
      key: "email",
      label: "E-mail",
      type: "email",
      required: true,
      autoComplete: "email",
      step: 1,
    },
    {
      key: "password",
      label: "Senha",
      type: "password",
      required: true,
      maxLength: 72,
      hint: "Entre 8 e 72 caracteres.",
      step: 1,
    },
    {
      key: "confirmPassword",
      label: "Confirmar senha",
      type: "password",
      required: true,
      maxLength: 72,
      step: 1,
    },
    {
      key: "cpf",
      label: "CPF",
      required: true,
      maxLength: 14,
      hint: "Obrigatório. Informe os 11 dígitos.",
      step: 2,
    },
    {
      key: "birthDate",
      label: "Data de nascimento",
      type: "date",
      required: true,
      step: 2,
    },
    ...(patient
      ? [
          {
            key: "phone" as const,
            label: "Telefone / WhatsApp",
            type: "tel",
            required: true,
            autoComplete: "tel",
            step: 2 as const,
          },
          {
            key: "emergencyContactName" as const,
            label: minor
              ? "Nome do responsável legal"
              : "Nome do contato de emergência (opcional)",
            required: minor,
            maxLength: 120,
            step: 3 as const,
          },
          {
            key: "emergencyContactPhone" as const,
            label: minor
              ? "Telefone do responsável legal"
              : "Telefone de emergência (opcional)",
            type: "tel",
            required: minor,
            step: 3 as const,
          },
          {
            key: "insuranceProvider" as const,
            label: "Plano de saúde (opcional)",
            maxLength: 100,
            step: 3 as const,
          },
          {
            key: "insuranceNumber" as const,
            label: "Número da carteirinha (opcional)",
            maxLength: 50,
            step: 3 as const,
          },
        ]
      : []),
  ];
  const consentId = `${prefix}-consent`;
  return (
    <div className="space-y-4">
      {patient && minor && (step === 3 || !step) && (
        <p className="rounded-lg border border-border bg-muted p-3 text-sm text-foreground">
          Paciente menor de 18 anos: os dados do responsável legal são
          obrigatórios.
        </p>
      )}
      {fields
        .filter((field) => !step || field.step === step)
        .map((field) => {
          const id = `${prefix}-${field.key}`;
          const describedBy =
            [
              field.hint ? `${id}-hint` : null,
              errors[field.key] ? `${id}-error` : null,
            ]
              .filter(Boolean)
              .join(" ") || undefined;
          return (
            <FormField
              key={field.key}
              id={id}
              label={field.label}
              hint={field.hint}
              error={errors[field.key]}
            >
              <input
                id={id}
                name={field.key}
                className={inputClassName}
                type={field.type ?? "text"}
                required={field.required}
                maxLength={field.maxLength}
                aria-invalid={!!errors[field.key]}
                aria-describedby={describedBy}
                autoComplete={
                  field.type === "password"
                    ? "new-password"
                    : field.key === "cpf"
                      ? "off"
                      : field.autoComplete
                }
                inputMode={
                  field.key === "cpf"
                    ? "numeric"
                    : field.type === "tel"
                      ? "tel"
                      : undefined
                }
                lang={field.type === "date" ? "pt-BR" : undefined}
                min={field.type === "date" ? "1900-01-01" : undefined}
                value={value[field.key]}
                onChange={(event) => {
                  const raw = event.target.value;
                  onChange({
                    [field.key]:
                      field.key === "cpf"
                        ? maskCpf(raw)
                        : field.type === "tel"
                          ? maskPhone(raw)
                          : raw,
                  });
                }}
              />
            </FormField>
          );
        })}
      {patient && (!step || step === 3) && (
        <div>
          <label
            htmlFor={consentId}
            className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-muted-foreground"
          >
            <input
              id={consentId}
              name="consent"
              type="checkbox"
              required
              checked={value.consent}
              aria-invalid={!!errors.consent}
              aria-describedby={
                errors.consent ? `${consentId}-error` : undefined
              }
              onChange={(event) => onChange({ consent: event.target.checked })}
              className="mt-0.5 size-5 shrink-0 accent-primary"
            />
            <span>
              {internal
                ? "Confirmo que o paciente ou responsável autorizou o uso dos dados para este cadastro."
                : "Autorizo o uso dos meus dados pessoais e de saúde pela Leperapia Clinic para atendimento e gestão de consultas, conforme a LGPD."}
            </span>
          </label>
          {errors.consent && (
            <p id={`${consentId}-error`} className="text-sm text-destructive">
              {errors.consent}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RegistrationProgress({
  step,
  patient = true,
}: {
  step: RegistrationStep;
  patient?: boolean;
}) {
  const steps = patient
    ? ["Acesso", "Dados pessoais", "Contato e plano"]
    : ["Acesso", "Dados pessoais"];
  return (
    <nav aria-label="Etapas do cadastro" className="space-y-2">
      <p className="text-sm font-medium text-foreground" aria-live="polite">
        Etapa {step} de {steps.length}: {steps[step - 1]}
      </p>
      <ol className="flex gap-2">
        {steps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
            className={`h-1.5 flex-1 rounded-full ${index < step ? "bg-primary" : "bg-muted"}`}
          >
            <span className="sr-only">
              {label}
              {index + 1 < step ? ", concluída" : ""}
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
