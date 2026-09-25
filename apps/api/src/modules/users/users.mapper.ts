// users.mapper.ts
import type { User } from '@lepera/db';
import type { UserResponse } from '@lepera/contracts';

/** Passe isto em toda query de User para o hash nem sair do banco. */
export const USER_OMIT = { passwordHash: true } as const;

export function toUserResponse(user: Omit<User, 'passwordHash'>): UserResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    birthDate: user.birthDate ? user.birthDate.toISOString() : null,
    photoUrl: user.photoUrl,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
