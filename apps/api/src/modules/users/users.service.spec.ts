import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const admin: AuthUser = { sub: 'admin-1', role: 'ADMIN' };
  const superAdmin: AuthUser = { sub: 'super-1', role: 'SUPER_ADMIN' };
  const baseDto = {
    cpf: '52998224725',
    name: 'Maria Souza',
    email: 'maria@email.com',
    password: 'Senha@123',
  };

  let service: UsersService;
  let userCreate: jest.Mock;
  let userFindUnique: jest.Mock;
  let userFindMany: jest.Mock;
  let userUpdate: jest.Mock;
  let doctorCreate: jest.Mock;
  let patientCreate: jest.Mock;
  let receptionistCreate: jest.Mock;
  let transaction: jest.Mock;

  beforeEach(() => {
    userCreate = jest.fn().mockResolvedValue({ id: 'user-1' });
    userFindUnique = jest.fn();
    userFindMany = jest.fn().mockResolvedValue([]);
    userUpdate = jest.fn().mockResolvedValue({ id: 'target-1' });
    doctorCreate = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    patientCreate = jest.fn().mockResolvedValue({ id: 'patient-1' });
    receptionistCreate = jest.fn().mockResolvedValue({ id: 'reception-1' });

    const tx = {
      user: { create: userCreate },
      doctor: { create: doctorCreate },
      patient: { create: patientCreate },
      receptionist: { create: receptionistCreate },
    };
    transaction = jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    service = new UsersService(
      {
        db: {
          $transaction: transaction,
          user: {
            findUnique: userFindUnique,
            findMany: userFindMany,
            update: userUpdate,
          },
        },
      } as unknown as PrismaService,
      {
        hash: jest.fn().mockResolvedValue('hashed'),
      } as unknown as PasswordService,
    );
  });

  describe('createWithProfile', () => {
    it('cria o perfil Patient junto com o usuário', async () => {
      await expect(
        service.createWithProfile({ ...baseDto, role: 'PATIENT' }, admin),
      ).resolves.toEqual({ id: 'user-1' });

      expect(patientCreate).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
      expect(doctorCreate).not.toHaveBeenCalled();
      expect(receptionistCreate).not.toHaveBeenCalled();
    });

    it('cria o perfil Receptionist junto com o usuário', async () => {
      await service.createWithProfile(
        { ...baseDto, role: 'RECEPTIONIST' },
        admin,
      );

      expect(receptionistCreate).toHaveBeenCalledWith({
        data: { userId: 'user-1' },
      });
      expect(patientCreate).not.toHaveBeenCalled();
    });

    it('cria o perfil Doctor com registro e especialidade', async () => {
      await service.createWithProfile(
        {
          ...baseDto,
          role: 'DOCTOR',
          licenseNumber: 'CRP 06/123456',
          specialty: 'Psicologia Clínica',
        },
        admin,
      );

      expect(doctorCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          licenseNumber: 'CRP 06/123456',
          specialty: 'Psicologia Clínica',
        },
      });
    });

    it('recusa DOCTOR sem registro ou especialidade, sem abrir transação', async () => {
      await expect(
        service.createWithProfile({ ...baseDto, role: 'DOCTOR' }, admin),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(transaction).not.toHaveBeenCalled();
    });

    it('converte e-mail duplicado (P2002) em conflito', async () => {
      userCreate.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.createWithProfile({ ...baseDto, role: 'PATIENT' }, admin),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(patientCreate).not.toHaveBeenCalled();
    });

    it('ADMIN NÃO cria administrador', async () => {
      await expect(
        service.createWithProfile({ ...baseDto, role: 'ADMIN' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(transaction).not.toHaveBeenCalled();
    });

    it('SUPER_ADMIN cria administrador (sem perfil extra)', async () => {
      await service.createWithProfile(
        { ...baseDto, role: 'ADMIN' },
        superAdmin,
      );

      expect(userCreate).toHaveBeenCalledTimes(1);
      expect(doctorCreate).not.toHaveBeenCalled();
      expect(patientCreate).not.toHaveBeenCalled();
      expect(receptionistCreate).not.toHaveBeenCalled();
    });
  });

  describe('listagem', () => {
    it('esconde o SUPER_ADMIN de quem não é SUPER_ADMIN', async () => {
      await service.findAll(admin);

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: { not: 'SUPER_ADMIN' } } }),
      );
    });

    it('o SUPER_ADMIN vê todos', async () => {
      await service.findAll(superAdmin);

      expect(userFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });
  });

  describe('gerenciar usuários existentes', () => {
    it('ADMIN não desativa outro ADMIN', async () => {
      userFindUnique.mockResolvedValue({ role: 'ADMIN' });

      await expect(
        service.deactivate('target-1', admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(userUpdate).not.toHaveBeenCalled();
    });

    it('ADMIN não edita o SUPER_ADMIN', async () => {
      userFindUnique.mockResolvedValue({ role: 'SUPER_ADMIN' });

      await expect(
        service.update('target-1', { name: 'Novo' }, admin),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ADMIN desativa um recepcionista', async () => {
      userFindUnique.mockResolvedValue({ role: 'RECEPTIONIST' });

      await service.deactivate('target-1', admin);

      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'target-1' },
          data: { isActive: false },
        }),
      );
    });

    it('SUPER_ADMIN desativa um ADMIN', async () => {
      userFindUnique.mockResolvedValue({ role: 'ADMIN' });

      await service.deactivate('target-1', superAdmin);

      expect(userUpdate).toHaveBeenCalledTimes(1);
    });

    it('ninguém desativa o SUPER_ADMIN pela API', async () => {
      userFindUnique.mockResolvedValue({ role: 'SUPER_ADMIN' });

      await expect(
        service.deactivate('super-1', superAdmin),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(userUpdate).not.toHaveBeenCalled();
    });

    it('responde 404 para usuário inexistente', async () => {
      userFindUnique.mockResolvedValue(null);

      await expect(
        service.update('nope', { name: 'X' }, superAdmin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
