"use client";

import { FormField, FormSection, inputClassName } from "@/components/forms/form-field";
import {
  PersonalFields,
  type PersonalFormState,
} from "@/components/profile/personal-fields";
import {
  isValidBirthDate,
  isValidCpf,
  isValidPhone,
  maskCep,
  maskCpf,
  maskPhone,
  onlyDigits,
  toDateInput,
} from "@/lib/br-format";

export type PatientFormState = PersonalFormState & {
  phone: string;
  zipCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  insuranceProvider: string;
  insuranceNumber: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

export const EMPTY_PATIENT_FORM: PatientFormState = {
  name: "",
  cpf: "",
  birthDate: "",
  phone: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  insuranceProvider: "",
  insuranceNumber: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

/** Formato devolvido por GET /patients/:id e GET /profile/me. */
export type PatientSource = {
  user: {
    name: string;
    cpf: string | null;
    birthDate: string | null;
  };
  patient: {
    insuranceProvider: string | null;
    insuranceNumber: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    phones: { phone: string }[];
    addresses: {
      street: string;
      number: string;
      complement: string | null;
      neighborhood: string;
      city: string;
      state: string;
      zipCode: string;
    }[];
  };
};

export function patientToForm({ user, patient }: PatientSource): PatientFormState {
  const address = patient.addresses[0];
  return {
    name: user.name,
    cpf: maskCpf(user.cpf ?? ""),
    birthDate: toDateInput(user.birthDate),
    phone: maskPhone(patient.phones[0]?.phone ?? ""),
    zipCode: address?.zipCode ?? "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    complement: address?.complement ?? "",
    neighborhood: address?.neighborhood ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
    insuranceProvider: patient.insuranceProvider ?? "",
    insuranceNumber: patient.insuranceNumber ?? "",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: maskPhone(patient.emergencyContactPhone ?? ""),
  };
}

const ADDRESS_KEYS = [
  "zipCode",
  "street",
  "number",
  "neighborhood",
  "city",
  "state",
] as const;

/** Valida o formulário; devolve a mensagem do 1º problema ou null. */
export function validatePatientForm(
  form: PatientFormState,
  opts: { cpfRequired: boolean },
): string | null {
  if (form.name.trim().length < 2) return "Informe o nome completo.";
  if ((opts.cpfRequired || form.cpf) && !isValidCpf(form.cpf)) {
    return "CPF inválido.";
  }
  if (form.birthDate && !isValidBirthDate(form.birthDate)) {
    return "Data de nascimento inválida.";
  }
  if (form.phone && !isValidPhone(form.phone)) {
    return "Telefone inválido (DDD + número).";
  }
  if (form.emergencyContactPhone && !isValidPhone(form.emergencyContactPhone)) {
    return "Telefone do contato de emergência inválido.";
  }

  const anyAddress = [...ADDRESS_KEYS, "complement" as const].some(
    (key) => form[key].trim() !== "",
  );
  const missing = ADDRESS_KEYS.some((key) => form[key].trim() === "");
  if (anyAddress && missing) {
    return "Para salvar o endereço, preencha CEP, rua, número, bairro, cidade e UF.";
  }
  if (form.state && form.state.trim().length !== 2) {
    return "UF deve ter 2 letras (ex.: SP).";
  }

  return null;
}

/**
 * Corpo do PATCH. O CPF só vai se foi alterado: assim um CPF antigo (ex.:
 * dado de teste) não bloqueia a edição dos outros campos.
 */
export function buildPatientPayload(
  form: PatientFormState,
  initial: PatientFormState,
  opts: { cpfLocked: boolean },
) {
  const text = (value: string) => (value.trim() === "" ? null : value.trim());
  const cpfChanged = onlyDigits(form.cpf) !== onlyDigits(initial.cpf);
  const hasAddress = ADDRESS_KEYS.every((key) => form[key].trim() !== "");

  return {
    name: form.name.trim(),
    birthDate: form.birthDate || undefined,
    ...(!opts.cpfLocked && cpfChanged && form.cpf
      ? { cpf: onlyDigits(form.cpf) }
      : {}),
    phone: onlyDigits(form.phone) || undefined,
    insuranceProvider: text(form.insuranceProvider),
    insuranceNumber: text(form.insuranceNumber),
    emergencyContactName: text(form.emergencyContactName),
    emergencyContactPhone: onlyDigits(form.emergencyContactPhone) || null,
    address: hasAddress
      ? {
          street: form.street.trim(),
          number: form.number.trim(),
          complement: text(form.complement),
          neighborhood: form.neighborhood.trim(),
          city: form.city.trim(),
          state: form.state.trim().toUpperCase(),
          zipCode: form.zipCode,
        }
      : undefined,
  };
}

type Props = {
  value: PatientFormState;
  onChange: (patch: Partial<PatientFormState>) => void;
  email?: string;
  cpfLocked?: boolean;
  idPrefix?: string;
};

/** Campos de cadastro do paciente (perfil, edição pela recepção). */
export function PatientFields({
  value,
  onChange,
  email,
  cpfLocked,
  idPrefix = "patient",
}: Props) {
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-8">
      <FormSection title="Dados pessoais">
        <PersonalFields
          value={value}
          onChange={onChange}
          email={email}
          cpfLocked={cpfLocked}
          idPrefix={idPrefix}
        />
      </FormSection>

      <FormSection title="Contato">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={id("phone")} label="Telefone / WhatsApp">
            <input
              id={id("phone")}
              className={inputClassName}
              inputMode="tel"
              placeholder="(12) 99999-9999"
              value={value.phone}
              onChange={(e) => onChange({ phone: maskPhone(e.target.value) })}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Endereço">
        <div className="grid gap-5 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <FormField id={id("zip")} label="CEP">
              <input
                id={id("zip")}
                className={inputClassName}
                inputMode="numeric"
                placeholder="00000-000"
                value={value.zipCode}
                onChange={(e) => onChange({ zipCode: maskCep(e.target.value) })}
              />
            </FormField>
          </div>
          <div className="sm:col-span-4">
            <FormField id={id("street")} label="Rua">
              <input
                id={id("street")}
                className={inputClassName}
                value={value.street}
                onChange={(e) => onChange({ street: e.target.value })}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField id={id("number")} label="Número">
              <input
                id={id("number")}
                className={inputClassName}
                value={value.number}
                onChange={(e) => onChange({ number: e.target.value })}
              />
            </FormField>
          </div>
          <div className="sm:col-span-4">
            <FormField id={id("complement")} label="Complemento (opcional)">
              <input
                id={id("complement")}
                className={inputClassName}
                value={value.complement}
                onChange={(e) => onChange({ complement: e.target.value })}
              />
            </FormField>
          </div>
          <div className="sm:col-span-3">
            <FormField id={id("neighborhood")} label="Bairro">
              <input
                id={id("neighborhood")}
                className={inputClassName}
                value={value.neighborhood}
                onChange={(e) => onChange({ neighborhood: e.target.value })}
              />
            </FormField>
          </div>
          <div className="sm:col-span-2">
            <FormField id={id("city")} label="Cidade">
              <input
                id={id("city")}
                className={inputClassName}
                value={value.city}
                onChange={(e) => onChange({ city: e.target.value })}
              />
            </FormField>
          </div>
          <div className="sm:col-span-1">
            <FormField id={id("state")} label="UF">
              <input
                id={id("state")}
                className={inputClassName}
                maxLength={2}
                value={value.state}
                onChange={(e) =>
                  onChange({ state: e.target.value.toUpperCase() })
                }
              />
            </FormField>
          </div>
        </div>
      </FormSection>

      <FormSection title="Plano de saúde">
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={id("insurance")} label="Operadora">
            <input
              id={id("insurance")}
              className={inputClassName}
              value={value.insuranceProvider}
              onChange={(e) => onChange({ insuranceProvider: e.target.value })}
            />
          </FormField>
          <FormField id={id("insuranceNumber")} label="Número da carteirinha">
            <input
              id={id("insuranceNumber")}
              className={inputClassName}
              value={value.insuranceNumber}
              onChange={(e) => onChange({ insuranceNumber: e.target.value })}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Contato de emergência / responsável legal"
        description="Obrigatório para menores de 18 anos."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id={id("emergencyName")} label="Nome">
            <input
              id={id("emergencyName")}
              className={inputClassName}
              value={value.emergencyContactName}
              onChange={(e) =>
                onChange({ emergencyContactName: e.target.value })
              }
            />
          </FormField>
          <FormField id={id("emergencyPhone")} label="Telefone">
            <input
              id={id("emergencyPhone")}
              className={inputClassName}
              inputMode="tel"
              value={value.emergencyContactPhone}
              onChange={(e) =>
                onChange({ emergencyContactPhone: maskPhone(e.target.value) })
              }
            />
          </FormField>
        </div>
      </FormSection>
    </div>
  );
}
