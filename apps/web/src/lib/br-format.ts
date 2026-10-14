// Máscaras e validações de campos brasileiros (CPF, telefone, CEP).
// A API recebe SÓ DÍGITOS; a máscara existe apenas na tela.

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(value: string) {
  const d = onlyDigits(value).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

/** CPF pelos dígitos verificadores (aceita com ou sem máscara). */
export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  for (const length of [9, 10]) {
    const sum = digits
      .slice(0, length)
      .reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0);
    if ((((sum * 10) % 11) % 10) !== digits[length]) return false;
  }
  return true;
}

export function isValidPhone(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 10 || digits.length === 11;
}

/** "YYYY-MM-DD" existente, não futura e ≥ 1900. Chame em handlers, não no render. */
export function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.toISOString().slice(0, 10) !== value) return false; // ex.: 31/02
  if (date.getUTCFullYear() < 1900) return false;
  return value <= new Date().toISOString().slice(0, 10);
}

/** Menor de 18 anos? Chame em handlers (usa a data atual). */
export function isUnder18(birthDate: string) {
  if (!isValidBirthDate(birthDate)) return false;
  const birth = new Date(`${birthDate}T12:00:00.000Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const months = now.getUTCMonth() - birth.getUTCMonth();
  if (months < 0 || (months === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age < 18;
}

/** "2026-10-08T12:00:00.000Z" → "2026-10-08" (para <input type="date">). */
export const toDateInput = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10) : "";
