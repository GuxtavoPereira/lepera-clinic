import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { PatientsService } from './patients.service';

describe('PatientsService.findForDoctor', () => {
  let service: PatientsService;
  let doctorFindUnique: jest.Mock;
  let patientFindMany: jest.Mock;
  let patientCount: jest.Mock;

  beforeEach(() => {
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    patientFindMany = jest.fn().mockResolvedValue([]);
    patientCount = jest.fn().mockResolvedValue(0);

    service = new PatientsService(
      {
        db: {
          doctor: { findUnique: doctorFindUnique },
          patient: { findMany: patientFindMany, count: patientCount },
        },
      } as unknown as PrismaService,
      {} as UsersService,
    );
  });

  it('só lista pacientes com consulta com ESTE profissional', async () => {
    await service.findForDoctor(
      { sub: 'doctor-user', role: 'DOCTOR' },
      { page: 1, pageSize: 20 },
    );

    expect(patientCount).toHaveBeenCalledWith({
      where: { appointments: { some: { doctorId: 'doctor-1' } } },
    });
  });

  it('não expõe CPF ao profissional', async () => {
    await service.findForDoctor(
      { sub: 'doctor-user', role: 'DOCTOR' },
      { page: 1, pageSize: 20 },
    );

    const [{ select }] = patientFindMany.mock.calls[0] as [
      { select: { user: { select: Record<string, boolean> } } },
    ];
    expect(select.user.select).toEqual({
      name: true,
      email: true,
      birthDate: true,
    });
  });

  it('busca por nome ou e-mail, mantendo o filtro do profissional', async () => {
    await service.findForDoctor(
      { sub: 'doctor-user', role: 'DOCTOR' },
      { page: 1, pageSize: 20, search: 'lucas' },
    );

    expect(patientCount).toHaveBeenCalledWith({
      where: {
        appointments: { some: { doctorId: 'doctor-1' } },
        user: {
          OR: [
            { name: { contains: 'lucas', mode: 'insensitive' } },
            { email: { contains: 'lucas', mode: 'insensitive' } },
          ],
        },
      },
    });
  });

  it('404 se o usuário não tem perfil profissional', async () => {
    doctorFindUnique.mockResolvedValue(null);

    await expect(
      service.findForDoctor(
        { sub: 'x', role: 'DOCTOR' },
        { page: 1, pageSize: 20 },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
