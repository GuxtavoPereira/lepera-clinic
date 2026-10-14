import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { UsersService } from './users.service';

describe('UsersService.updatePersonalData', () => {
  let service: UsersService;
  let userFindUnique: jest.Mock;
  let userUpdate: jest.Mock;

  beforeEach(() => {
    userFindUnique = jest.fn().mockResolvedValue({ cpf: null });
    userUpdate = jest.fn().mockResolvedValue({ id: 'user-1' });

    service = new UsersService(
      {
        db: { user: { findUnique: userFindUnique, update: userUpdate } },
      } as unknown as PrismaService,
      {} as PasswordService,
    );
  });

  it('define o CPF quando ainda não existe', async () => {
    await service.updatePersonalData(
      'user-1',
      { cpf: '52998224725' },
      { allowCpfChange: false },
    );

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ cpf: '52998224725' }) as unknown,
      }),
    );
  });

  it('o próprio usuário não troca um CPF já cadastrado', async () => {
    userFindUnique.mockResolvedValue({ cpf: '11144477735' });

    await expect(
      service.updatePersonalData(
        'user-1',
        { cpf: '52998224725' },
        { allowCpfChange: false },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('reenviar o mesmo CPF não é considerado alteração', async () => {
    userFindUnique.mockResolvedValue({ cpf: '52998224725' });

    await service.updatePersonalData(
      'user-1',
      { cpf: '52998224725', name: 'Novo Nome' },
      { allowCpfChange: false },
    );

    expect(userUpdate).toHaveBeenCalledTimes(1);
  });

  it('recepção/admin pode corrigir o CPF', async () => {
    userFindUnique.mockResolvedValue({ cpf: '11144477735' });

    await service.updatePersonalData(
      'user-1',
      { cpf: '52998224725' },
      { allowCpfChange: true },
    );

    expect(userUpdate).toHaveBeenCalledTimes(1);
  });

  it('converte o nascimento e recusa data inválida', async () => {
    await service.updatePersonalData(
      'user-1',
      { birthDate: '1990-05-20' },
      { allowCpfChange: false },
    );
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          birthDate: new Date('1990-05-20T12:00:00.000Z'),
        }) as unknown,
      }),
    );

    await expect(
      service.updatePersonalData(
        'user-1',
        { birthDate: '2999-01-01' },
        { allowCpfChange: false },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('responde 404 para usuário inexistente', async () => {
    userFindUnique.mockResolvedValue(null);

    await expect(
      service.updatePersonalData('nope', {}, { allowCpfChange: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
