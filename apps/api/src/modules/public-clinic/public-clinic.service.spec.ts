import { PrismaService } from '../../prisma/prisma.service';
import { PublicClinicService } from './public-clinic.service';

describe('PublicClinicService privacy', () => {
  const doctors = jest.fn();
  const receptionists = jest.fn();
  const prisma = {
    db: {
      doctor: { findMany: doctors },
      receptionist: { findMany: receptionists },
    },
  } as unknown as PrismaService;
  const service = new PublicClinicService(prisma);

  beforeEach(() => jest.clearAllMocks());

  it('publishes only active clinical and reception presentations without account or patient data', async () => {
    doctors.mockResolvedValue([
      {
        id: 'doctor-1',
        specialty: 'Psicologia Clínica',
        clinicalApproach: 'TCC',
        bio: 'Apresentação profissional',
        licenseNumber: '06/000001',
        userId: 'private-user-id',
        patients: ['sensitive'],
        user: {
          name: 'Ana',
          photoUrl: null,
          cpf: 'private-cpf',
          email: 'private-email',
          passwordHash: 'private-hash',
          birthDate: 'private-date',
        },
      },
    ]);
    receptionists.mockResolvedValue([
      {
        id: 'reception-1',
        extension: 'private-extension',
        user: { name: 'Maria', photoUrl: null, email: 'private-email' },
      },
    ]);

    const result = await service.team();
    expect(result).toEqual({
      doctors: [
        {
          id: 'doctor-1',
          name: 'Ana',
          specialty: 'Psicologia Clínica',
          clinicalApproach: 'TCC',
          bio: 'Apresentação profissional',
          licenseNumber: '06/000001',
          photoUrl: null,
        },
      ],
      receptionists: [{ id: 'reception-1', name: 'Maria', photoUrl: null }],
    });
    expect(doctors).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { isActive: true, role: 'DOCTOR' } },
        select: expect.objectContaining({
          user: { select: { name: true, photoUrl: true } },
        }) as unknown,
      }),
    );
    expect(receptionists).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { isActive: true, role: 'RECEPTIONIST' } },
      }),
    );
    expect(JSON.stringify(result)).not.toContain('private-');
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });
});
