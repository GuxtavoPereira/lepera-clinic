import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import { trimLower } from '../../../common/transforms';
import { PersonalDataDto } from './personal-data.dto';

export class UpdateUserDto extends PersonalDataDto {
  @IsOptional()
  @Transform(trimLower)
  @IsEmail({}, { message: 'E-mail inválido' })
  email?: string;
}
