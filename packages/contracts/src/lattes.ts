/** Accept the public curriculum address only; never arbitrary external URLs. */
export function normalizeLattesUrl(value: string): string | null {
  const match = /^https?:\/\/lattes\.cnpq\.br\/(\d{16})\/?$/i.exec(value.trim());
  return match ? `https://lattes.cnpq.br/${match[1]}` : null;
}
