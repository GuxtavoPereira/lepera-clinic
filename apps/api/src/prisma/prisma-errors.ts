// apps/api/src/prisma/prisma-errors.ts
/** P2002 = violação de unicidade (e-mail ou CPF repetido numa corrida entre duas requisições). */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 'P2002'
  );
}
