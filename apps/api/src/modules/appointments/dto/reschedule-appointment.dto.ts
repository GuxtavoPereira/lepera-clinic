import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class RescheduleAppointmentDto {
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'Informe o novo horário com o fuso horário',
  })
  startDatetime!: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  expectedUpdatedAt!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(5, 1000, {
    message: 'Informe um motivo com 5 a 1000 caracteres',
  })
  reason!: string;

  @IsOptional()
  @IsBoolean()
  allowOutsideAvailability?: boolean;
}
