import { Modality, ScheduleRequestMode, Shift } from '@lepera/db';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateScheduleRequestDto {
  @IsOptional()
  @IsEnum(ScheduleRequestMode)
  mode?: ScheduleRequestMode;

  @IsOptional()
  @IsDateString()
  requestedStartDatetime?: string;

  @IsOptional()
  @IsIn(['IN_PERSON'], {
    message: 'A clínica realiza somente consultas presenciais',
  })
  modality?: Modality;

  @IsIn(['novo_paciente', 'reagendamento'])
  type!: 'novo_paciente' | 'reagendamento';

  @IsOptional()
  @IsString()
  @MaxLength(100)
  preferredDoctorId?: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsEnum(Shift)
  preferredShift?: Shift;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
