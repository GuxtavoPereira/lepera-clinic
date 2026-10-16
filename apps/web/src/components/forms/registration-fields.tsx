"use client";
import { FormField, inputClassName } from "@/components/forms/form-field";
import {
  isUnder18,
  isValidBirthDate,
  isValidCpf,
  isValidPhone,
  maskCpf,
  maskPhone,
  onlyDigits,
} from "@/lib/br-format";
import type { RegisterPayload } from "@/lib/auth";
export type RegistrationForm = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  cpf: string;
  birthDate: string;
  phone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  insuranceProvider: string;
  insuranceNumber: string;
  consent: boolean;
};
export const EMPTY_REGISTRATION: RegistrationForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  cpf: "",
  birthDate: "",
  phone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  insuranceProvider: "",
  insuranceNumber: "",
  consent: false,
};
export function validateRegistration(
  form: RegistrationForm,
  patient = true,
): string | null {
  if (form.name.trim().length < 2) return "Informe o nome completo.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "E-mail inválido.";
  if (form.password.length < 8 || form.password.length > 72)
    return "A senha deve ter entre 8 e 72 caracteres.";
  if (form.password !== form.confirmPassword) return "As senhas não conferem.";
  if (!isValidCpf(form.cpf)) return "Informe um CPF válido.";
  if (!isValidBirthDate(form.birthDate))
    return "Informe uma data de nascimento válida.";
  if (patient) {
    if (!isValidPhone(form.phone)) return "Informe um telefone válido com DDD.";
    if (
      isUnder18(form.birthDate) &&
      (form.emergencyContactName.trim().length < 2 ||
        !isValidPhone(form.emergencyContactPhone))
    )
      return "Menor de 18 anos: informe nome e telefone do responsável legal.";
    if (form.emergencyContactPhone && !isValidPhone(form.emergencyContactPhone))
      return "Telefone do contato de emergência inválido.";
    if (!form.consent)
      return "Confirme a autorização do paciente ou responsável para este cadastro.";
  }
  return null;
}
export function registrationPayload(form: RegistrationForm): RegisterPayload {
  return {
    name: form.name.trim(),
    email: form.email.trim(),
    password: form.password,
    cpf: onlyDigits(form.cpf),
    birthDate: form.birthDate,
    phone: onlyDigits(form.phone),
    emergencyContactName: form.emergencyContactName.trim() || undefined,
    emergencyContactPhone: onlyDigits(form.emergencyContactPhone) || undefined,
    insuranceProvider: form.insuranceProvider.trim() || undefined,
    insuranceNumber: form.insuranceNumber.trim() || undefined,
  };
}
export function RegistrationFields({
  value,
  onChange,
  patient = true,
  prefix = "registration",
}: {
  value: RegistrationForm;
  onChange: (patch: Partial<RegistrationForm>) => void;
  patient?: boolean;
  prefix?: string;
}) {
  const minor = isUnder18(value.birthDate);
  const fields: {
    key: Exclude<keyof RegistrationForm, "consent">;
    label: string;
    type?: string;
    required?: boolean;
    maxLength?: number;
  }[] = [
    { key: "name", label: "Nome completo", required: true, maxLength: 120 },
    { key: "email", label: "E-mail", type: "email", required: true },
    {
      key: "password",
      label: "Senha",
      type: "password",
      required: true,
      maxLength: 72,
    },
    {
      key: "confirmPassword",
      label: "Confirmar senha",
      type: "password",
      required: true,
      maxLength: 72,
    },
    { key: "cpf", label: "CPF", required: true, maxLength: 14 },
    {
      key: "birthDate",
      label: "Data de nascimento",
      type: "date",
      required: true,
    },
    ...(patient
      ? [
          {
            key: "phone" as const,
            label: "Telefone / WhatsApp",
            type: "tel",
            required: true,
          },
          {
            key: "emergencyContactName" as const,
            label: minor
              ? "Nome do responsável legal"
              : "Nome do contato de emergência (opcional)",
            required: minor,
            maxLength: 120,
          },
          {
            key: "emergencyContactPhone" as const,
            label: minor
              ? "Telefone do responsável legal"
              : "Telefone do contato de emergência (opcional)",
            type: "tel",
            required: minor,
          },
          {
            key: "insuranceProvider" as const,
            label: "Plano de saúde (opcional)",
            maxLength: 100,
          },
          {
            key: "insuranceNumber" as const,
            label: "Número do plano (opcional)",
            maxLength: 50,
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FormField
          key={field.key}
          id={`${prefix}-${field.key}`}
          label={field.label}
        >
          <input
            id={`${prefix}-${field.key}`}
            className={inputClassName}
            type={field.type ?? "text"}
            required={field.required}
            maxLength={field.maxLength}
            autoComplete={
              field.type === "password"
                ? "new-password"
                : field.key === "cpf"
                  ? "off"
                  : undefined
            }
            inputMode={field.key === "cpf" ? "numeric" : undefined}
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
      ))}
      {patient && (
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            required
            checked={value.consent}
            onChange={(event) => onChange({ consent: event.target.checked })}
            className="mt-1 accent-teal-700"
          />
          <span>
            Confirmo que o paciente ou responsável autorizou o uso dos dados
            para este cadastro.
          </span>
        </label>
      )}
    </div>
  );
}
