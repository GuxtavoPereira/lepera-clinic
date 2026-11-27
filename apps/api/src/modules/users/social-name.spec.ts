import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SocialNameDto } from './dto/social-name.dto';
import { RegisterPatientDto } from '../auth/dto/register.dto';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { ProfileController } from '../profile/profile.controller';
import { ProfileService } from '../profile/profile.service';

describe('Social name preference', () => {
  it('validates and normalizes optional name and requires an actual boolean', async () => {
    const dto = plainToInstance(SocialNameDto, {
      socialName: '  Nome Social  ',
      useSocialName: true,
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.socialName).toBe('Nome Social');
    for (const invalid of [
      { socialName: 'A' },
      { socialName: 'a'.repeat(121) },
      { useSocialName: 'true' },
      { useSocialName: null },
    ]) {
      expect(
        await validate(plainToInstance(SocialNameDto, invalid)),
      ).not.toEqual([]);
    }
    expect(
      plainToInstance(SocialNameDto, { socialName: '' }).socialName,
    ).toBeNull();
    const fields = await validate(
      plainToInstance(RegisterPatientDto, {
        socialName: 'Nome Social',
        useSocialName: true,
      }),
    );
    expect(
      fields.some((field) =>
        ['socialName', 'useSocialName'].includes(field.property),
      ),
    ).toBe(false);
  });

  it('preserves civil identity in prepared creation data and rejects activation without a social name', async () => {
    const service = new UsersService(
      {} as PrismaService,
      {
        hash: jest.fn().mockResolvedValue('hash'),
      } as unknown as PasswordService,
    );
    const base = {
      name: 'Nome Civil',
      cpf: '52998224725',
      email: 'test@example.test',
      password: 'Test1234!',
      role: 'PATIENT' as const,
    };
    expect(
      await service.prepareCreate({
        ...base,
        socialName: 'Nome Social',
        useSocialName: true,
      }),
    ).toMatchObject({
      civilName: 'Nome Civil',
      socialName: 'Nome Social',
      useSocialName: true,
    });
    expect(await service.prepareCreate(base)).toMatchObject({
      civilName: 'Nome Civil',
      socialName: null,
      useSocialName: false,
    });
    await expect(
      service.prepareCreate({ ...base, useSocialName: true }),
    ).rejects.toThrow('Informe o nome social');
  });

  it('only updates the authenticated account through the preference endpoint', async () => {
    const updatePersonalData = jest
      .fn()
      .mockResolvedValue({ name: 'Nome Social' });
    const controller = new ProfileController(
      {} as ProfileService,
      { updatePersonalData } as unknown as UsersService,
    );
    await controller.updateNamePreference(
      { socialName: 'Nome Social', useSocialName: true },
      { user: { sub: 'own-id', role: 'PATIENT' }, headers: {} },
    );
    expect(updatePersonalData).toHaveBeenCalledWith(
      'own-id',
      { socialName: 'Nome Social', useSocialName: true },
      { allowCpfChange: false },
    );
    const errors = await validate(
      plainToInstance(SocialNameDto, {
        id: 'other-id',
        role: 'ADMIN',
        name: 'Hidden rename',
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );
    expect(errors.map((error) => error.property).sort()).toEqual([
      'id',
      'name',
      'role',
    ]);
  });
});
