import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { digitsOnly, trimLower } from '../../../common/transforms';

import { IsCpf } from '../../../common/validators/is-cpf.decorator';

export type Role = 'RECEPTIONIST' | 'PATIENT' | 'DOCTOR' | 'ADMIN';
const ROLES: Role[] = ['RECEPTIONIST', 'PATIENT', 'DOCTOR', 'ADMIN'];

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'O nome precisa de pelo menos 2 caracteres' })
  name!: string;

  @Transform(trimLower)
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa de pelo menos 8 caracteres' })
  password!: string;

  @Transform(digitsOnly)
  @IsCpf()
  cpf!: string;

  @IsIn(ROLES, { message: 'Perfil inválido' })
  role!: Role;

  // Só exigidos quando role === 'DOCTOR' (o perfil Doctor tem esses campos
  // obrigatórios no schema).
  @ValidateIf((dto: CreateUserDto) => dto.role === 'DOCTOR')
  @IsString({ message: 'Informe o número do CRP/CRM' })
  @MinLength(3, { message: 'Informe o número do CRP/CRM' })
  licenseNumber?: string;

  @ValidateIf((dto: CreateUserDto) => dto.role === 'DOCTOR')
  @IsString({ message: 'Informe a especialidade' })
  @MinLength(2, { message: 'Informe a especialidade' })
  specialty?: string;
}
