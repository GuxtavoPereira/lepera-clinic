import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDoctorDto {
  // Campos do usuário-base
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

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