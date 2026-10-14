import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  cep,
  digitsOnly,
  trim,
  trimLower,
  upper,
} from '../../../common/transforms';
import { IsCpf } from '../../../common/validators/is-cpf.decorator';
import { DATE_ONLY, PersonalDataDto } from '../../users/dto/personal-data.dto';

const PHONE = /^\d{10,11}$/;
const PHONE_MESSAGE = 'Telefone inválido (DDD + número)';

export class AddressDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  street!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  complement?: string | null;

  @Transform(trim)
  @IsString()
  @MaxLength(100)
  neighborhood!: string;

  @Transform(trim)
  @IsString()
  @MaxLength(100)
  city!: string;

  @Transform(upper)
  @Matches(/^[A-Z]{2}$/, { message: 'UF inválida' })
  state!: string;

  @Transform(cep)
  @Matches(/^\d{5}-\d{3}$/, { message: 'CEP inválido' })
  zipCode!: string;
}

/** Campos comuns do cadastro de paciente (público ou feito pela recepção). */
export class PatientDataDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'O nome precisa de pelo menos 2 caracteres' })
  @MaxLength(120)
  name!: string;

  @Transform(trimLower)
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha precisa de pelo menos 8 caracteres' })
  @MaxLength(72)
  password!: string;

  @Transform(digitsOnly)
  @IsCpf()
  cpf!: string;

  @Matches(DATE_ONLY, { message: 'Use o formato AAAA-MM-DD' })
  birthDate!: string;

  @Transform(digitsOnly)
  @Matches(PHONE, { message: PHONE_MESSAGE })
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  insuranceNumber?: string;

  /** Para menores de 18 anos: responsável legal. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @Transform(digitsOnly)
  @Matches(PHONE, { message: PHONE_MESSAGE })
  emergencyContactPhone?: string;
}

/** Criado pela recepção/admin: pode definir o profissional responsável. */
export class CreatePatientDto extends PatientDataDto {
  @IsOptional()
  @IsString()
  responsibleDoctorId?: string; // o id do Doctor, não do User
}

export class UpdatePatientDto extends PersonalDataDto {
  @IsOptional()
  @Transform(digitsOnly)
  @Matches(PHONE, { message: PHONE_MESSAGE })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  insuranceProvider?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  insuranceNumber?: string | null;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string | null;

  @IsOptional()
  @Transform(digitsOnly)
  @Matches(PHONE, { message: PHONE_MESSAGE })
  emergencyContactPhone?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}
