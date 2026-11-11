import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditService } from '../audit/audit.service';
import { UsersService } from '../users/users.service';
import { PatientsService } from './patients.service';

describe('PatientsService professional access', () => {
  let service: PatientsService;
  let doctorFindUnique: jest.Mock;
  let patientFindFirst: jest.Mock;
  let patientFindMany: jest.Mock;
  let patientCount: jest.Mock;
  let auditLog: jest.Mock;

  beforeEach(() => {
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    patientFindFirst = jest.fn().mockResolvedValue(null);
    patientFindMany = jest.fn().mockResolvedValue([]);
    patientCount = jest.fn().mockResolvedValue(0);
    auditLog = jest.fn();

    service = new PatientsService(
      {
        db: {
          doctor: { findUnique: doctorFindUnique },
          patient: {
            findFirst: patientFindFirst,
            findMany: patientFindMany,
            count: patientCount,
          },
        },
      } as unknown as PrismaService,
      {} as UsersService,
      { log: auditLog } as unknown as AuditService,
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

  it('limita a ficha ao vínculo do profissional, aos campos essenciais e às cinco consultas recentes', async () => {
    const actor = { sub: 'doctor-user', role: 'DOCTOR' } as const;
    const summary = {
      id: 'patient-1',
      user: {
        name: 'Paciente',
        email: 'paciente@example.com',
        birthDate: new Date('1990-01-01T12:00:00Z'),
      },
      phones: [],
      appointments: [],
    };
    patientFindFirst.mockResolvedValue(summary);

    await expect(
      service.getSummaryForDoctor('patient-1', actor, { ip: '127.0.0.1' }),
    ).resolves.toEqual({
      ...summary,
      user: {
        name: 'Paciente',
        email: 'paciente@example.com',
        age: new Date().getUTCFullYear() - 1990,
      },
    });

    expect(patientFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'patient-1',
        appointments: { some: { doctorId: 'doctor-1' } },
      },
      select: {
        id: true,
        user: { select: { name: true, email: true, birthDate: true } },
        phones: {
          select: { phone: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
        appointments: {
          where: {
            doctorId: 'doctor-1',
            startDatetime: { lte: expect.any(Date) as unknown },
          },
          orderBy: [{ startDatetime: 'desc' }, { id: 'desc' }],
          take: 5,
          select: { id: true, startDatetime: true, status: true },
        },
      },
    });
    expect(auditLog).toHaveBeenCalledWith({
      actor,
      action: 'patient.summary.read',
      resource: 'patient',
      resourceId: 'patient-1',
      ip: '127.0.0.1',
    });
  });

  it('oculta paciente sem vínculo e registra apenas leituras autorizadas', async () => {
    await expect(
      service.getSummaryForDoctor(
        'unknown-patient',
        { sub: 'doctor-user', role: 'DOCTOR' },
        {},
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(auditLog).not.toHaveBeenCalled();
  });
});
