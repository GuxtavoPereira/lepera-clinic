/** Valida CPF (11 dígitos, só números) pelos dígitos verificadores. */
export function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value)) return false;
  if (/^(\d)\1{10}$/.test(value)) return false; // 111.111.111-11 etc.

  const digits = value.split('').map(Number);

  for (const length of [9, 10]) {
    const sum = digits
      .slice(0, length)
      .reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0);
    const check = ((sum * 10) % 11) % 10;
    if (check !== digits[length]) return false;
  }

  return true;
}
