import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { digitsOnly, trim } from '../../../common/transforms';
import { IsCpf } from '../../../common/validators/is-cpf.decorator';

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Dados pessoais editáveis de qualquer usuário (base dos DTOs de perfil). */
export class PersonalDataDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'O nome precisa de pelo menos 2 caracteres' })
  @MaxLength(120)
  name?: string;

  @ValidateIf((_object: PersonalDataDto, value: unknown) => value !== undefined)
  @Transform(digitsOnly)
  @IsCpf()
  cpf?: string;

  @IsOptional()
  @Matches(DATE_ONLY, { message: 'Use o formato AAAA-MM-DD' })
  birthDate?: string;
}
