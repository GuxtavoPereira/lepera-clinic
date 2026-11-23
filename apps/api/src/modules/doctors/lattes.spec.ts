import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { DoctorsService } from './doctors.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';

describe('Optional Lattes profile', () => {
  it.each([
    'https://evil.example/1234567890123456',
    'https://lattes.cnpq.br.evil.example/1234567890123456',
    'https://lattes.cnpq.br/1234567890123456?next=https://evil.example',
    'javascript:alert(1)',
    'https://user:password@lattes.cnpq.br/1234567890123456',
    'https://lattes.cnpq.br/123',
  ])('rejects unsafe or incomplete links: %s', async (lattesUrl) => {
    const errors = await validate(
      plainToInstance(UpdateDoctorProfileDto, { lattesUrl }),
    );
    expect(errors.some((error) => error.property === 'lattesUrl')).toBe(true);
  });

  it('normalizes public HTTP links, trims summaries, and allows clearing both fields', async () => {
    const dto = plainToInstance(UpdateDoctorProfileDto, {
      lattesUrl: ' http://lattes.cnpq.br/1234567890123456/ ',
      lattesSummary: ' Formação e trajetória ',
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.lattesUrl).toBe('https://lattes.cnpq.br/1234567890123456');
    expect(dto.lattesSummary).toBe('Formação e trajetória');
    const clear = plainToInstance(UpdateDoctorProfileDto, {
      lattesUrl: ' ',
      lattesSummary: '',
    });
    expect(await validate(clear)).toEqual([]);
    expect(clear).toMatchObject({ lattesUrl: null, lattesSummary: null });
    expect(
      await validate(
        plainToInstance(UpdateDoctorProfileDto, {
          lattesSummary: 'a'.repeat(2001),
        }),
      ),
    ).not.toEqual([]);
  });

  it('updates only the authenticated professional and preserves omitted fields', async () => {
    const update = jest.fn().mockResolvedValue({});
    const personal = jest.fn();
    const lookup = jest.fn().mockResolvedValue({ id: 'own-doctor' });
    const tx = { doctor: { update } };
    const service = new DoctorsService(
      {
        db: {
          doctor: { findUnique: lookup },
          $transaction: (callback: (client: typeof tx) => Promise<void>) =>
            callback(tx),
        },
      } as unknown as PrismaService,
      { updatePersonalData: personal } as unknown as UsersService,
    );
    await service.updateMine(
      { sub: 'own-user', role: 'DOCTOR' },
      { lattesSummary: 'Resumo' },
    );
    expect(lookup).toHaveBeenCalledWith({
      where: { userId: 'own-user' },
      select: { id: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'own-doctor' },
      data: {
        bio: undefined,
        clinicalApproach: undefined,
        room: undefined,
        lattesUrl: undefined,
        lattesSummary: 'Resumo',
      },
    });
    await service.updateMine(
      { sub: 'own-user', role: 'DOCTOR' },
      { lattesUrl: null, lattesSummary: null },
    );
    expect(update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lattesUrl: null,
          lattesSummary: null,
        }) as unknown,
      }),
    );
  });
});
