export type Role = 'RECEPTIONIST' | 'PATIENT' | 'DOCTOR' | 'ADMIN';
export class CreateUserDto {
  name!: string;
  email!: string;
  password!: string;
  role!: Role;
}
