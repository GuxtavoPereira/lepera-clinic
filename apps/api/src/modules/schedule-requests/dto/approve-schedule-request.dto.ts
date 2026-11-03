import { AppointmentType, Modality } from '@lepera/db';
import {
  IsDateString,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

export class ApproveScheduleRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  doctorId?: string;

  @IsOptional()
  @IsDateString()
  startDatetime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(240)
  durationMinutes?: number;

  @IsOptional()
  @IsEnum(Modality)
  modality?: Modality;

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  roomOrLink?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  receptionNotes?: string;

  @IsOptional()
  @IsBoolean()
  allowOutsideAvailability?: boolean;
}
