import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { calendarRange, clinicInstant } from './calendar-time';
import { CalendarQueryDto } from './dto/calendar-query.dto';

describe('calendar civil dates in America/Sao_Paulo', () => {
  it('converts inclusive/exclusive civil midnights without the server timezone', () => {
    const range = calendarRange({ from: '2026-10-19', to: '2026-10-20' });
    expect(range.from.toISOString()).toBe('2026-10-19T03:00:00.000Z');
    expect(range.to.toISOString()).toBe('2026-10-20T03:00:00.000Z');
    expect(clinicInstant('2026-10-19', 8 * 60 + 30).toISOString()).toBe(
      '2026-10-19T11:30:00.000Z',
    );
  });

  it('uses the timezone rules for historical dates instead of a fixed offset', () => {
    expect(clinicInstant('2018-12-10', 8 * 60).toISOString()).toBe(
      '2018-12-10T10:00:00.000Z',
    );
  });

  it.each([
    ['2026-02-29', '2026-03-01'],
    ['2026-13-01', '2026-13-02'],
    ['2026-10-19T00:00:00Z', '2026-10-20'],
    ['2026-10-19', '2026-10-19'],
    ['2026-10-20', '2026-10-19'],
    ['2026-10-19', '2026-12-01'],
  ])('rejects invalid or excessive ranges %s → %s', (from, to) => {
    expect(() => calendarRange({ from, to })).toThrow(BadRequestException);
  });

  it('accepts a valid leap day and exactly 42 days', () => {
    expect(() =>
      calendarRange({ from: '2028-02-29', to: '2028-04-11' }),
    ).not.toThrow();
  });

  it.each([null, '', ['doctor-1']])(
    'rejects an invalid optional doctor filter: %s',
    async (doctorId) => {
      const errors = await validate(
        plainToInstance(CalendarQueryDto, {
          from: '2026-10-19',
          to: '2026-10-20',
          doctorId,
        }),
      );
      expect(errors.some((error) => error.property === 'doctorId')).toBe(true);
    },
  );

  it('rejects missing dates in the HTTP query DTO', async () => {
    const errors = await validate(plainToInstance(CalendarQueryDto, {}));
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['from', 'to']),
    );
  });
});
