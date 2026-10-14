import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  const adult = {
    name: 'Maria Souza',
    email: 'maria@email.com',
    password: 'Senha@123',
    cpf: '52998224725',
    birthDate: '1990-05-20',
    phone: '12999998888',
  };

  let service: PatientsService;
  let usersCreate: jest.Mock;
  let updatePersonalData: jest.Mock;
  let patientCreate: jest.Mock;
  let patientUpdate: jest.Mock;
  let patientFindUnique: jest.Mock;
  let patientFindMany: jest.Mock;
  let patientCount: jest.Mock;
  let doctorFindUnique: jest.Mock;
  let phoneFindFirst: jest.Mock;
  let phoneUpdate: jest.Mock;
  let phoneCreate: jest.Mock;
  let addressFindFirst: jest.Mock;
  let addressCreate: jest.Mock;

  beforeEach(() => {
    usersCreate = jest.fn().mockResolvedValue({
      id: 'user-1',
      name: adult.name,
      email: adult.email,
    });
    updatePersonalData = jest.fn().mockResolvedValue({});
    patientCreate = jest
      .fn()
      .mockResolvedValue({ id: 'patient-1', phones: [] });
    patientUpdate = jest.fn().mockResolvedValue({});
    patientFindUnique = jest.fn();
    patientFindMany = jest.fn().mockResolvedValue([]);
    patientCount = jest.fn().mockResolvedValue(0);
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    phoneFindFirst = jest.fn().mockResolvedValue(null);
    phoneUpdate = jest.fn().mockResolvedValue({});
    phoneCreate = jest.fn().mockResolvedValue({});
    addressFindFirst = jest.fn().mockResolvedValue(null);
    addressCreate = jest.fn().mockResolvedValue({});

    const db = {
      patient: {
        create: patientCreate,
        update: patientUpdate,
        findUnique: patientFindUnique,
        findMany: patientFindMany,
        count: patientCount,
      },
      doctor: { findUnique: doctorFindUnique },
      patientPhone: {
        findFirst: phoneFindFirst,
        update: phoneUpdate,
        create: phoneCreate,
      },
      patientAddress: {
        findFirst: addressFindFirst,
        update: jest.fn(),
        create: addressCreate,
      },
      $transaction: jest.fn(
        (callback: (client: unknown) => Promise<unknown>): Promise<unknown> =>
          callback(db),
      ),
    };

    service = new PatientsService(
      { db } as unknown as PrismaService,
      { create: usersCreate, updatePersonalData } as unknown as UsersService,
    );
  });

  describe('create', () => {
    it('cria usuário (com CPF e nascimento), perfil e telefone', async () => {
      await service.create(adult);

      expect(usersCreate).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'PATIENT', email: adult.email }),
        expect.anything(),
        { cpf: adult.cpf, birthDate: new Date('1990-05-20T12:00:00.000Z') },
      );
      expect(patientCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            phones: { create: { type: 'mobile', phone: adult.phone } },
          }) as unknown,
        }),
      );
    });

    it('menor de 18 anos exige responsável legal', async () => {
      const year = new Date().getUTCFullYear() - 10;

      await expect(
        service.create({ ...adult, birthDate: `${year}-01-15` }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersCreate).not.toHaveBeenCalled();

      await expect(
        service.create({
          ...adult,
          birthDate: `${year}-01-15`,
          emergencyContactName: 'Ana Souza',
          emergencyContactPhone: '12988887777',
        }),
      ).resolves.toBeDefined();
    });

    it('recusa data de nascimento inválida', async () => {
      await expect(
        service.create({ ...adult, birthDate: '2999-01-01' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('converte e-mail/CPF duplicado (P2002) em conflito', async () => {
      usersCreate.mockRejectedValue({ code: 'P2002' });

      await expect(service.create(adult)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('recusa profissional responsável inexistente', async () => {
      doctorFindUnique.mockResolvedValue(null);

      await expect(
        service.create({ ...adult, responsibleDoctorId: 'nope' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('sem busca não filtra e pagina', async () => {
      await service.findAll({ page: 3, pageSize: 10 });

      expect(patientFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 20, take: 10 }),
      );
    });

    it('busca por nome, e-mail e CPF (só dígitos)', async () => {
      await service.findAll({ page: 1, pageSize: 20, search: '529.982' });

      expect(patientCount).toHaveBeenCalledWith({
        where: {
          user: {
            OR: [
              { name: { contains: '529.982', mode: 'insensitive' } },
              { email: { contains: '529.982', mode: 'insensitive' } },
              { cpf: { contains: '529982' } },
            ],
          },
        },
      });
    });

    it('busca só por texto não inclui CPF', async () => {
      await service.findAll({ page: 1, pageSize: 20, search: 'maria' });

      const [{ where }] = patientCount.mock.calls[0] as [
        { where: { user: { OR: unknown[] } } },
      ];
      expect(where.user.OR).toHaveLength(2);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      patientFindUnique.mockResolvedValue({
        id: 'patient-1',
        userId: 'user-1',
        user: {},
        phones: [],
        addresses: [],
        appointments: [],
      });
    });

    it('recepção pode corrigir o CPF; o próprio paciente não', async () => {
      await service.update('patient-1', { cpf: adult.cpf });
      expect(updatePersonalData).toHaveBeenLastCalledWith(
        'user-1',
        { cpf: adult.cpf },
        { allowCpfChange: true },
        expect.anything(),
      );

      await service.updateMine(
        { sub: 'patient-user', role: 'PATIENT' },
        { cpf: adult.cpf },
      );
      expect(updatePersonalData).toHaveBeenLastCalledWith(
        'user-1',
        { cpf: adult.cpf },
        { allowCpfChange: false },
        expect.anything(),
      );
    });

    it('atualiza o telefone existente ou cria se não houver', async () => {
      await service.update('patient-1', { phone: '12911112222' });
      expect(phoneCreate).toHaveBeenCalledTimes(1);

      phoneFindFirst.mockResolvedValue({ id: 'phone-1' });
      await service.update('patient-1', { phone: '12933334444' });
      expect(phoneUpdate).toHaveBeenCalledWith({
        where: { id: 'phone-1' },
        data: { phone: '12933334444' },
      });
    });

    it('cria o endereço quando ainda não existe', async () => {
      const address = {
        street: 'Rua A',
        number: '10',
        neighborhood: 'Centro',
        city: 'Caraguatatuba',
        state: 'SP',
        zipCode: '11660-005',
      };

      await service.update('patient-1', { address });

      expect(addressCreate).toHaveBeenCalledWith({
        data: { patientId: 'patient-1', ...address },
      });
    });

    it('responde 404 para paciente inexistente', async () => {
      patientFindUnique.mockResolvedValue(null);

      await expect(service.update('nope', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('CPF duplicado vira conflito', async () => {
      updatePersonalData.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.update('patient-1', { cpf: adult.cpf }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
