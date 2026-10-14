import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCancellationRequestDto {
  @IsString()
  appointmentId!: string;

  @IsString()
  @MinLength(5, { message: 'Explique o motivo do cancelamento' })
  @MaxLength(500)
  reason!: string;
}

export class ApproveCancellationRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RejectCancellationRequestDto {
  @IsString()
  @MinLength(3, { message: 'Informe o motivo da recusa' })
  @MaxLength(500)
  note!: string;
}
