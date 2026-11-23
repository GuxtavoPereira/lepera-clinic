/** Privacy display, distinct from the punctuation mask used while editing CPF. */
export function privateCpf(value: string | null | undefined): string {
  if (!value) return "Não informado";
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 ? `***.***.***-${digits.slice(-2)}` : "CPF protegido";
}

/** Conservative redaction for report text: never export a bounded 11-digit identifier. */
export function redactCpfText(value: string): string {
  return value.replace(/(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/g, privateCpf);
}
