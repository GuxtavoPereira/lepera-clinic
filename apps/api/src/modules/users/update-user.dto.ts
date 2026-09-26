// apps/api/src/modules/users/dto/update-user.dto.ts

/**
 * `Partial<T>` é um "utility type" do TypeScript: pega um tipo e deixa
 * todos os campos opcionais. Aqui usamos para dizer "pode editar o nome
 * e/ou o e-mail, mas não é obrigatório mandar os dois".
 */
export class UpdateUserDto {
  name?: string;
  email?: string;
}
