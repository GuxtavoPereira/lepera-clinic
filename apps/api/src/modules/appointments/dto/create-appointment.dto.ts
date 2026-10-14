import { AppointmentType, Modality } from '@lepera/db';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  patientId!: string;

  @IsString()
  doctorId!: string;

  @IsDateString()
  startDatetime!: string;

  @IsInt()
  @Min(1)
  durationMinutes!: number;

  @IsOptional()
  @IsEnum(Modality)
  modality?: Modality;

  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @IsOptional()
  @IsString()
  roomOrLink?: string;

  @IsOptional()
  @IsString()
  receptionNotes?: string;

  /** Encaixe: permite marcar fora do horário de atendimento do profissional. */
  @IsOptional()
  @IsBoolean()
  allowOutsideAvailability?: boolean;
}
