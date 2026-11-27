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
import { digitsOnly, trim, trimLower } from '../../../common/transforms';
import { IsCpf } from '../../../common/validators/is-cpf.decorator';
import { DATE_ONLY } from '../../users/dto/personal-data.dto';
import { SocialNameDto } from '../../users/dto/social-name.dto';

const PHONE = /^\d{10,11}$/;
const PHONE_MESSAGE = 'Telefone inválido (DDD + número)';

export class DependentDataDto extends SocialNameDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, {
    message: 'O nome do dependente precisa de pelo menos 2 caracteres',
  })
  @MaxLength(120)
  name!: string;

  @Transform(digitsOnly)
  @IsCpf()
  cpf!: string;

  @Matches(DATE_ONLY, { message: 'Use o formato AAAA-MM-DD' })
  birthDate!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  relationship!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  insuranceProvider?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(50)
  insuranceNumber?: string;
}

export class RegisterGuardianDto extends SocialNameDto {
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

  @ValidateNested()
  @Type(() => DependentDataDto)
  dependent!: DependentDataDto;
}
