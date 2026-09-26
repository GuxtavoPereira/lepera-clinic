// apps/api/src/modules/users/dto/create-user.dto.ts

// Por enquanto Role é só uma lista de textos permitidos, escrita à mão.
// (Mais tarde isso pode voltar a vir do @lepera/contracts.)
export type Role = 'RECEPTIONIST' | 'PATIENT' | 'DOCTOR' | 'ADMIN';

/**
 * Um DTO ("Data Transfer Object") é só uma FORMA. Ele diz quais campos
 * esperamos receber no corpo (body) da requisição. Ainda não estamos
 * validando nada de verdade — é só um "molde" para o TypeScript nos ajudar
 * com autocomplete e para não deixar passar campo com nome errado.
 */
export class CreateUserDto {
  name!: string;
  email!: string;
  password!: string; // senha em texto puro, só nesta etapa (ainda vai virar hash no service)
  role!: Role;
}
