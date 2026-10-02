import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export type Role = 'RECEPTIONIST' | 'PATIENT' | 'DOCTOR' | 'ADMIN';
const ROLES: Role[] = ['RECEPTIONIST', 'PATIENT', 'DOCTOR', 'ADMIN'];

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'O nome precisa de pelo menos 2 caracteres' })
  name!: string;

  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa de pelo menos 8 caracteres' })
  password!: string;

  @IsIn(ROLES, { message: 'Perfil inválido' })
  role!: Role;
}
