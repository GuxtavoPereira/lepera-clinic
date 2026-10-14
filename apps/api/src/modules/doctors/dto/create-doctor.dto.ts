import { Transform } from 'class-transformer';
import { digitsOnly, trimLower } from '../../../common/transforms';
import { IsCpf } from '../../../common/validators/is-cpf.decorator';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDoctorDto {
  // Campos do usuário-base
  @IsString()
  @MinLength(2)
  name!: string;

  @Transform(trimLower)
  @IsEmail()
  email!: string;

  @Transform(digitsOnly)
  @IsCpf()
  cpf!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  // Campos específicos do médico
  @IsString()
  @MinLength(3, { message: 'Informe o número do CRP/CRM' })
  licenseNumber!: string;

  @IsString()
  @MinLength(2)
  specialty!: string;

  @IsOptional()
  @IsString()
  clinicalApproach?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  room?: string;
}
