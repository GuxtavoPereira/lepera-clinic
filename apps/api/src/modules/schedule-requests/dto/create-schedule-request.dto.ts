import { Shift } from '@lepera/db';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateScheduleRequestDto {
  @IsIn(['novo_paciente', 'reagendamento'])
  type!: 'novo_paciente' | 'reagendamento';

  @IsOptional()
  @IsString()
  preferredDoctorId?: string;

  @IsOptional()
  @IsDateString()
  preferredDate?: string;

  @IsOptional()
  @IsEnum(Shift)
  preferredShift?: Shift;

  @IsOptional()
  @IsString()
  reason?: string;
}
