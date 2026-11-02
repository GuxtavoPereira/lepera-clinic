import type { RegisterPayload } from "@/lib/auth";
import {
  isUnder18,
  isValidBirthDate,
  isValidCpf,
  isValidPhone,
  onlyDigits,
} from "@/lib/br-format";

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
export type RegistrationField =
  keyof RegistrationForm | "licenseNumber" | "specialty";
export type RegistrationErrors = Partial<Record<RegistrationField, string>>;
export type RegistrationStep = 1 | 2 | 3;
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
export function registrationStepForField(
  field: RegistrationField,
): RegistrationStep {
  if (["name", "email", "password", "confirmPassword"].includes(field))
    return 1;
  if (
    ["cpf", "birthDate", "phone", "licenseNumber", "specialty"].includes(field)
  )
    return 2;
  return 3;
}
export function registrationErrors(
  form: RegistrationForm,
  patient = true,
  step?: RegistrationStep,
): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!step || step === 1) {
    if (form.name.trim().length < 2 || form.name.trim().length > 120)
      errors.name = "Informe o nome completo, entre 2 e 120 caracteres.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      errors.email = "Informe um e-mail válido, como nome@exemplo.com.";
    if (form.password.length < 8 || form.password.length > 72)
      errors.password = "A senha deve ter entre 8 e 72 caracteres.";
    if (!form.confirmPassword || form.password !== form.confirmPassword)
      errors.confirmPassword = "As senhas não conferem.";
  }
  if (!step || step === 2) {
    if (!isValidCpf(form.cpf))
      errors.cpf = "Informe um CPF válido com 11 dígitos.";
    if (!isValidBirthDate(form.birthDate))
      errors.birthDate =
        "Informe uma data de nascimento válida, a partir de 1900 e não futura.";
    if (patient && !isValidPhone(form.phone))
      errors.phone = "Informe o telefone com DDD (10 ou 11 dígitos).";
  }
  if (patient && (!step || step === 3)) {
    const minor = isUnder18(form.birthDate);
    if (
      (minor && form.emergencyContactName.trim().length < 2) ||
      form.emergencyContactName.trim().length > 120
    )
      errors.emergencyContactName = minor
        ? "Informe o nome completo do responsável legal."
        : "Use até 120 caracteres para o nome do contato.";
    if (
      (minor || form.emergencyContactPhone) &&
      !isValidPhone(form.emergencyContactPhone)
    )
      errors.emergencyContactPhone = minor
        ? "Informe o telefone do responsável legal com DDD."
        : "Informe um telefone de emergência válido com DDD.";
    if (form.insuranceProvider.trim().length > 100)
      errors.insuranceProvider =
        "Use até 100 caracteres para o plano de saúde.";
    if (form.insuranceNumber.trim().length > 50)
      errors.insuranceNumber =
        "Use até 50 caracteres para o número da carteirinha.";
    if (!form.consent)
      errors.consent = "Confirme a autorização para usar os dados no cadastro.";
  }
  return errors;
}
/** Compatibilidade com os consumidores que precisam apenas da primeira mensagem. */
export function validateRegistration(
  form: RegistrationForm,
  patient = true,
): string | null {
  return Object.values(registrationErrors(form, patient))[0] ?? null;
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
