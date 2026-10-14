import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AvailabilitySlotDto {
  /** 0 = domingo … 6 = sábado */
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @Matches(HHMM, { message: 'Horário inicial inválido (use HH:MM)' })
  startTime!: string;

  @Matches(HHMM, { message: 'Horário final inválido (use HH:MM)' })
  endTime!: string;
}

export class ReplaceAvailabilityDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots!: AvailabilitySlotDto[];
}
