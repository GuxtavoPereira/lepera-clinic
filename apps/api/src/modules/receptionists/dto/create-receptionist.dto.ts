import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateReceptionistDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  extension?: string; // ramal
}
