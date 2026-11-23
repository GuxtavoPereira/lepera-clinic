import { Transform } from 'class-transformer';
import { normalizeLattesUrl } from '@lepera/contracts';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PersonalDataDto } from '../../users/dto/personal-data.dto';

export class UpdateDoctorProfileDto extends PersonalDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  clinicalApproach?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  bio?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim()
        ? (normalizeLattesUrl(value) ?? value.trim())
        : null
      : value,
  )
  @IsString()
  @Matches(/^https:\/\/lattes\.cnpq\.br\/\d{16}$/, {
    message:
      'Informe o link público do Lattes: https://lattes.cnpq.br/ seguido dos 16 dígitos',
  })
  lattesUrl?: string | null;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  @MaxLength(2000)
  lattesSummary?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  room?: string | null;
}
