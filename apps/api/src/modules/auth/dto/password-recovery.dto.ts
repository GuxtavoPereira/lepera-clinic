import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimLower } from '../../../common/transforms';
export class ForgotPasswordDto {
  @Transform(trimLower) @IsEmail() @MaxLength(254) email!: string;
}
export class ResetPasswordDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve conter letras e números.',
  })
  password!: string;
}
