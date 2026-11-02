import { BadRequestException } from '@nestjs/common';
import {
  financialAmount,
  financialDate,
  financialRange,
  financialToday,
} from './financial.utils';

describe('financial money and civil dates', () => {
  it('keeps cent arithmetic exact and accepts the column maximum', () => {
    expect(
      financialAmount('0.10').plus(financialAmount('0.20')).toFixed(2),
    ).toBe('0.30');
    expect(financialAmount('99999999.99').toFixed(2)).toBe('99999999.99');
  });

  it.each([
    '0',
    '0.00',
    '-1',
    '1.001',
    '100000000',
    '1e3',
    'NaN',
    'Infinity',
    '1,50',
    '01.00',
    ' 1.00',
  ])('rejects invalid money: %s', (value) => {
    expect(() => financialAmount(value)).toThrow(BadRequestException);
  });

  it('preserves a civil date independently of the host timezone', () => {
    expect(financialDate('2028-02-29').toISOString()).toBe(
      '2028-02-29T00:00:00.000Z',
    );
  });

  it.each([
    '2026-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-01-00',
    '2026-01-01T12:00:00Z',
    '1899-12-31',
    'not-a-date',
  ])('rejects a nonexistent or malformed date: %s', (value) => {
    expect(() => financialDate(value)).toThrow(BadRequestException);
  });

  it('computes today in São Paulo on the UTC day boundary', () => {
    expect(financialToday(new Date('2026-11-01T01:30:00Z'))).toBe('2026-10-31');
    expect(financialToday(new Date('2026-11-01T03:00:00Z'))).toBe('2026-11-01');
  });

  it('accepts an inclusive single-day or 366-day range', () => {
    expect(financialRange('2026-11-01', '2026-11-01')).toEqual({
      gte: new Date('2026-11-01T00:00:00Z'),
      lte: new Date('2026-11-01T00:00:00Z'),
    });
    expect(() => financialRange('2026-01-01', '2027-01-01')).not.toThrow();
  });

  it('rejects reversed or oversized ranges', () => {
    expect(() => financialRange('2026-11-02', '2026-11-01')).toThrow(
      BadRequestException,
    );
    expect(() => financialRange('2026-01-01', '2027-01-02')).toThrow(
      BadRequestException,
    );
  });
});
