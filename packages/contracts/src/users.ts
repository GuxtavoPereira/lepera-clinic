// packages/contracts/src/users.ts
import { z } from "zod";
import { RoleSchema } from "./enums";

const CpfSchema = z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos (só números)");
const BirthDateSchema = z.string().date("Use o formato AAAA-MM-DD");

export const PasswordSchema = z
  .string()
  .min(8, "A senha precisa de pelo menos 8 caracteres")
  .max(72, "A senha pode ter no máximo 72 caracteres");

export const CreateUserBaseSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: PasswordSchema,
  cpf: CpfSchema.optional(),
  birthDate: BirthDateSchema.optional(),
  photoUrl: z.string().url("URL inválida").optional(),
});
export type CreateUserBaseInput = z.infer<typeof CreateUserBaseSchema>;

export const UpdateUserSchema = CreateUserBaseSchema.omit({ password: true })
  .partial()
  .extend({
    cpf: CpfSchema.nullable().optional(),
    birthDate: BirthDateSchema.nullable().optional(),
    photoUrl: z.string().url().nullable().optional(),
  });
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export const SetUserStatusSchema = z.object({ isActive: z.boolean() });
export type SetUserStatusInput = z.infer<typeof SetUserStatusSchema>;

export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  role: RoleSchema.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().min(1).optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

export const UserResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  cpf: z.string().nullable(),
  birthDate: z.string().nullable(),
  photoUrl: z.string().nullable(),
  role: RoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};