// Funções para @Transform (class-transformer): normalizam a entrada ANTES da
// validação, então "123.456.789-09" e "(12) 99999-9999" são aceitos.

type Param = { value: unknown };

export const digitsOnly = ({ value }: Param) =>
  typeof value === 'string' ? value.replace(/\D/g, '') : value;

export const trimLower = ({ value }: Param) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export const trim = ({ value }: Param) =>
  typeof value === 'string' ? value.trim() : value;

export const upper = ({ value }: Param) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

/** "12345678" ou "12345-678" → "12345-678" */
export const cep = ({ value }: Param) => {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D/g, '');
  return digits.length === 8
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : value;
};
