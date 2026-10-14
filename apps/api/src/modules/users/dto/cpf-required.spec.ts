import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDoctorDto } from '../../doctors/dto/create-doctor.dto';
import { CreateReceptionistDto } from '../../receptionists/dto/create-receptionist.dto';
import { CreatePatientDto } from '../../patients/dto/patient-data.dto';
import { RegisterPatientDto } from '../../auth/dto/register.dto';
import { CreateUserDto } from './create-user.dto';
import { PersonalDataDto } from './personal-data.dto';

const creationDtos: Array<[string, new () => object]> = [
  ['user', CreateUserDto],
  ['doctor', CreateDoctorDto],
  ['receptionist', CreateReceptionistDto],
  ['patient', CreatePatientDto],
  ['public registration', RegisterPatientDto],
];

describe.each(creationDtos)('CPF required for %s', (_name, Dto) => {
  it.each([undefined, null, '', '11111111111', '52998224724'])(
    'rejects missing or invalid CPF (%s)',
    async (cpf) => {
      const errors = await validate(plainToInstance(Dto, { cpf }));
      expect(errors.some((error) => error.property === 'cpf')).toBe(true);
    },
  );

  it('accepts a CPF with valid check digits and normalizes its mask', async () => {
    const instance = plainToInstance(Dto, { cpf: '529.982.247-25' });
    const errors = await validate(instance);
    expect(errors.some((error) => error.property === 'cpf')).toBe(false);
    expect(instance).toMatchObject({ cpf: '52998224725' });
  });
});

describe('CPF updates', () => {
  it('accepts omission but rejects removing or clearing the required CPF', async () => {
    expect(await validate(plainToInstance(PersonalDataDto, {}))).toHaveLength(
      0,
    );
    for (const cpf of [null, '']) {
      const errors = await validate(plainToInstance(PersonalDataDto, { cpf }));
      expect(errors.some((error) => error.property === 'cpf')).toBe(true);
    }
  });
});
