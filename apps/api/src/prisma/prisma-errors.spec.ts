import { isTransactionConflict } from './prisma-errors';
describe('Prisma adapter transaction failures', () => {
  it.each([
    { code: 'P2034' },
    { code: '40001' },
    { code: '40P01' },
    { cause: { originalCode: '40001', kind: 'TransactionWriteConflict' } },
    { cause: { cause: { originalCode: '40P01' } } },
  ])('normalizes a serialization/deadlock conflict %#', (error) => {
    expect(isTransactionConflict(error)).toBe(true);
  });
  it.each([
    null,
    undefined,
    'failure',
    { code: 'P2002' },
    { cause: { originalCode: '23505' } },
    { code: 'P2028' },
  ])('does not mislabel unrelated database failures %#', (error) => {
    expect(isTransactionConflict(error)).toBe(false);
  });
  it('bounds traversal of malformed/cyclic causes', () => {
    const error: { cause?: unknown } = {};
    error.cause = error;
    expect(isTransactionConflict(error)).toBe(false);
  });
});
