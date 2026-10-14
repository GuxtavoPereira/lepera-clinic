import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../users/password.service';
import { UsersService } from '../users/users.service';
import { PatientsService } from '../patients/patients.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let findByEmail: jest.Mock;
  let verify: jest.Mock;
  let patientsCreate: jest.Mock;
  let signAsync: jest.Mock;

  beforeEach(() => {
    findByEmail = jest.fn();
    verify = jest.fn().mockResolvedValue(true);
    patientsCreate = jest.fn();
    signAsync = jest.fn().mockResolvedValue('token-123');

    service = new AuthService(
      { findByEmailWithPassword: findByEmail } as unknown as UsersService,
      { verify } as unknown as PasswordService,
      { signAsync } as unknown as JwtService,
      { create: patientsCreate } as unknown as PatientsService,
    );
  });

  it('register cria o paciente e já devolve a sessão (sem expor dados extras)', async () => {
    patientsCreate.mockResolvedValue({
      id: 'user-1',
      name: 'Maria',
      email: 'maria@email.com',
      role: 'PATIENT',
      cpf: '52998224725',
      patient: { id: 'patient-1' },
    });

    const session = await service.register({
      name: 'Maria',
      email: 'maria@email.com',
      password: 'Senha@123',
      cpf: '52998224725',
      birthDate: '1990-05-20',
      phone: '12999998888',
    });

    expect(signAsync).toHaveBeenCalledWith({ sub: 'user-1', role: 'PATIENT' });
    expect(session).toEqual({
      accessToken: 'token-123',
      user: {
        id: 'user-1',
        name: 'Maria',
        email: 'maria@email.com',
        role: 'PATIENT',
      },
    });
  });

  it('login recusa usuário desativado e senha errada', async () => {
    findByEmail.mockResolvedValue({
      id: 'u',
      passwordHash: 'h',
      isActive: false,
    });
    await expect(service.login('a@b.com', 'x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    findByEmail.mockResolvedValue({
      id: 'u',
      passwordHash: 'h',
      isActive: true,
    });
    verify.mockResolvedValue(false);
    await expect(service.login('a@b.com', 'x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('login válido devolve token e dados básicos', async () => {
    findByEmail.mockResolvedValue({
      id: 'u1',
      name: 'Ana',
      email: 'ana@b.com',
      role: 'DOCTOR',
      passwordHash: 'h',
      isActive: true,
    });

    await expect(service.login('ana@b.com', 'ok')).resolves.toEqual({
      accessToken: 'token-123',
      user: { id: 'u1', name: 'Ana', email: 'ana@b.com', role: 'DOCTOR' },
    });
  });
});
