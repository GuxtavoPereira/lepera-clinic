import { Transform } from 'class-transformer';
import {
  IsBoolean,
  ValidateIf,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SocialNameDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  socialName?: string | null;

  @ValidateIf((_object: SocialNameDto, value: unknown) => value !== undefined)
  @IsBoolean()
  useSocialName?: boolean;
}
