import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import {
  CancelFinancialDto,
  CreateFinancialDto,
  FinancialAppointmentQueryDto,
  FinancialQueryDto,
  ReopenFinancialDto,
  SettleFinancialDto,
  UpdateFinancialDto,
} from './financial.dto';

const version = '2026-10-29T12:00:00.000Z';
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const create = {
  type: 'INCOME',
  amount: '180.00',
  description: 'Sessão',
  category: 'Consultas',
  dueDate: '2026-11-01',
};
function body(value: unknown, metatype: ArgumentMetadata['metatype']) {
  return pipe.transform(value, { type: 'body', metatype });
}

describe('financial request validation', () => {
  it('trims descriptions and categories without coercing money', async () => {
    await expect(
      body(
        { ...create, description: ' Sessão ', category: ' Consultas ' },
        CreateFinancialDto,
      ),
    ).resolves.toMatchObject(create);
  });

  it.each([
    { amount: 180 },
    { amount: null },
    { amount: '-2' },
    { amount: '1.001' },
    { description: '   ' },
    { category: '' },
    { dueDate: null },
    { appointmentId: null },
    { appointmentId: 'not-a-uuid' },
    { type: 'SALARY' },
    { status: 'PAID' },
    { userId: 'another-user' },
  ])('rejects invalid or privileged create fields: %j', async (patch) => {
    await expect(
      body({ ...create, ...patch }, CreateFinancialDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('limits edits to amount, description, category and due date', async () => {
    await expect(
      body(
        { expectedUpdatedAt: version, description: 'Outra descrição' },
        UpdateFinancialDto,
      ),
    ).resolves.toMatchObject({ description: 'Outra descrição' });
    await expect(
      body({ expectedUpdatedAt: version, type: 'EXPENSE' }, UpdateFinancialDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      body({ expectedUpdatedAt: version, status: 'PAID' }, UpdateFinancialDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      body({ expectedUpdatedAt: version, amount: null }, UpdateFinancialDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a settlement method and rejects arbitrary methods', async () => {
    await expect(
      body(
        {
          expectedUpdatedAt: version,
          paidAt: '2026-11-01',
          paymentMethod: 'PIX',
        },
        SettleFinancialDto,
      ),
    ).resolves.toBeInstanceOf(SettleFinancialDto);
    await expect(
      body(
        { expectedUpdatedAt: version, paidAt: '2026-11-01' },
        SettleFinancialDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      body(
        {
          expectedUpdatedAt: version,
          paidAt: '2026-11-01',
          paymentMethod: 'UNKNOWN',
        },
        SettleFinancialDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires a nonempty cancellation reason', async () => {
    await expect(
      body({ expectedUpdatedAt: version, reason: '  ' }, CancelFinancialDto),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      body(
        { expectedUpdatedAt: version, reason: ' x '.repeat(200) },
        CancelFinancialDto,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      body(
        { expectedUpdatedAt: version, reason: ' Cobrança duplicada ' },
        CancelFinancialDto,
      ),
    ).resolves.toMatchObject({
      expectedUpdatedAt: version,
      reason: 'Cobrança duplicada',
    });
  });

  it('rejects hidden payload fields when reopening', async () => {
    await expect(
      body({ expectedUpdatedAt: version }, ReopenFinancialDto),
    ).resolves.toBeInstanceOf(ReopenFinancialDto);
    await expect(
      body({ expectedUpdatedAt: version, amount: '1.00' }, ReopenFinancialDto),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires filter dates, validates enum and bounds pagination', async () => {
    const query = {
      from: '2026-11-01',
      to: '2026-11-30',
      page: '2',
      pageSize: '50',
    };
    await expect(
      pipe.transform(query, { type: 'query', metatype: FinancialQueryDto }),
    ).resolves.toMatchObject({ page: 2, pageSize: 50 });
    for (const invalid of [
      {},
      { ...query, page: '0' },
      { ...query, pageSize: '101' },
      { ...query, status: 'ALL' },
      { ...query, type: null },
    ]) {
      await expect(
        pipe.transform(invalid, { type: 'query', metatype: FinancialQueryDto }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(
      pipe.transform(
        { pageSize: '51' },
        { type: 'query', metatype: FinancialAppointmentQueryDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    { metatype: UpdateFinancialDto, payload: { amount: '1.00' } },
    {
      metatype: SettleFinancialDto,
      payload: { paidAt: '2026-11-01', paymentMethod: 'PIX' },
    },
    { metatype: CancelFinancialDto, payload: { reason: 'Revisão' } },
    { metatype: ReopenFinancialDto, payload: {} },
  ])(
    'requires a canonical version timestamp for $metatype',
    async ({ metatype, payload }) => {
      await expect(
        pipe.transform(
          { ...payload, expectedUpdatedAt: version },
          { type: 'body', metatype },
        ),
      ).resolves.toBeInstanceOf(metatype);
      for (const expectedUpdatedAt of [
        undefined,
        null,
        '',
        'invalid',
        '2026-11-01',
        '2026-02-30T12:00:00.000Z',
      ]) {
        await expect(
          pipe.transform(
            { ...payload, expectedUpdatedAt },
            { type: 'body', metatype },
          ),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    },
  );
});
