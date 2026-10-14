import { IsOptional, IsString, MaxLength } from 'class-validator';
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
  @IsString()
  @MaxLength(100)
  room?: string | null;
}
