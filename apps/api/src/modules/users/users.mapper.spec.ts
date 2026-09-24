// users.mapper.spec.ts
import { toUserResponse } from './users.mapper';

describe('toUserResponse', () => {
  it('nunca devolve o passwordHash e serializa datas em ISO', () => {
    const now = new Date('2026-01-01T10:00:00.000Z');
    const user = {
      id: 'u1', name: 'Ana', email: 'ana@x.com', cpf: null, birthDate: null,
      photoUrl: null, role: 'PATIENT' as const, isActive: true,
      createdAt: now, updatedAt: now, passwordHash: 'segredo',
    };

    const result = toUserResponse(user);

    expect(result).not.toHaveProperty('passwordHash');
    expect(result.createdAt).toBe('2026-01-01T10:00:00.000Z');
  });
});