import { Modality, ScheduleRequestMode, Shift } from '@lepera/db';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { DependentDataDto } from '../../auth/dto/register-guardian.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class AddDependentDto extends DependentDataDto {}

export class PortalScheduleRequestDto {
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
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class PortalCancelAppointmentDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  reason?: string;
}
