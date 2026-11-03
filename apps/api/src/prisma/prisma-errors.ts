export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

/** Prisma 7 adapters can surface serialization failures directly at COMMIT. */
export function isTransactionConflict(error: unknown, depth = 0): boolean {
  if (typeof error !== 'object' || error === null || depth > 4) return false;
  if (
    'code' in error &&
    ['P2034', '40001', '40P01'].includes(String(error.code))
  )
    return true;
  if (
    'originalCode' in error &&
    ['40001', '40P01'].includes(String(error.originalCode))
  )
    return true;
  if ('kind' in error && error.kind === 'TransactionWriteConflict') return true;
  return 'cause' in error && isTransactionConflict(error.cause, depth + 1);
}
