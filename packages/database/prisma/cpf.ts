/** CPF validation shared by browser contracts and API consumers. */
export function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const digits = value.split("").map(Number);
  for (const length of [9, 10]) {
    const sum = digits.slice(0, length).reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    if (((sum * 10) % 11) % 10 !== digits[length]) return false;
  }
  return true;
}