import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Shift, WaitlistPriority } from '@lepera/db';

export class CreateWaitlistEntryDto {
  /** Só a recepção informa; o paciente entra sempre por si mesmo. */
  @IsOptional()
  @IsString()
  patientId?: string;

  /** Sem profissional = aceita qualquer um. */
  @IsOptional()
  @IsString()
  preferredDoctorId?: string;

  @IsOptional()
  @IsEnum(Shift)
  preferredShift?: Shift;

  /** Só a recepção define; paciente entra com prioridade média. */
  @IsOptional()
  @IsEnum(WaitlistPriority)
  priority?: WaitlistPriority;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UpdateWaitlistEntryDto {
  @IsOptional()
  @IsIn(['waiting', 'scheduled', 'gave_up'])
  status?: 'waiting' | 'scheduled' | 'gave_up';

  @IsOptional()
  @IsEnum(WaitlistPriority)
  priority?: WaitlistPriority;
}
