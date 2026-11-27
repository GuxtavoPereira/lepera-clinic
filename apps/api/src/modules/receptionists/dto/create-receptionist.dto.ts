import { SocialNameDto } from '../../users/dto/social-name.dto';
import { Transform } from 'class-transformer';
import { digitsOnly, trimLower } from '../../../common/transforms';
import { IsCpf } from '../../../common/validators/is-cpf.decorator';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReceptionistDto extends SocialNameDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Transform(trimLower)
  @IsEmail()
  email!: string;

  @Transform(digitsOnly)
  @IsCpf()
  cpf!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  extension?: string; // ramal
}
