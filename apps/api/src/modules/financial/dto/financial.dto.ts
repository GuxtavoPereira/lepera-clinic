import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import type {
  FinancialDisplayStatus,
  FinancialPaymentMethod,
  FinancialType,
} from '@lepera/contracts';

const provided = (_: unknown, value: unknown) => value !== undefined;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const amountPattern = /^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/;

export class FinancialQueryDto {
  @IsString()
  @Matches(datePattern)
  from!: string;

  @IsString()
  @Matches(datePattern)
  to!: string;

  @ValidateIf(provided)
  @IsIn(['INCOME', 'EXPENSE'])
  type?: FinancialType;

  @ValidateIf(provided)
  @IsIn(['PENDING', 'PAID', 'CANCELLED', 'OVERDUE'])
  status?: FinancialDisplayStatus;

  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export class FinancialAppointmentQueryDto {
  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  q?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize: number = 20;
}

export class CreateFinancialDto {
  @IsIn(['INCOME', 'EXPENSE'])
  type!: FinancialType;

  @IsString()
  @Matches(amountPattern, {
    message:
      'Informe um valor positivo com até duas casas decimais, usando ponto',
  })
  amount!: string;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  description!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category!: string;

  @IsString()
  @Matches(datePattern)
  dueDate!: string;

  @ValidateIf(provided)
  @IsUUID()
  appointmentId?: string;
}

export class FinancialVersionDto {
  @IsString()
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  expectedUpdatedAt!: string;
}

export class UpdateFinancialDto extends FinancialVersionDto {
  @ValidateIf(provided)
  @IsString()
  @Matches(amountPattern)
  amount?: string;

  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  description?: string;

  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category?: string;

  @ValidateIf(provided)
  @IsString()
  @Matches(datePattern)
  dueDate?: string;
}

export class SettleFinancialDto extends FinancialVersionDto {
  @IsString()
  @Matches(datePattern)
  paidAt!: string;

  @IsIn([
    'PIX',
    'CASH',
    'DEBIT_CARD',
    'CREDIT_CARD',
    'BANK_TRANSFER',
    'INSURANCE',
    'OTHER',
  ])
  paymentMethod!: FinancialPaymentMethod;
}

export class CancelFinancialDto extends FinancialVersionDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}

export class ReopenFinancialDto extends FinancialVersionDto {}
