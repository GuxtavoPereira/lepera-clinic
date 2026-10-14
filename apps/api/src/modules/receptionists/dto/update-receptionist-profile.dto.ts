import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PersonalDataDto } from '../../users/dto/personal-data.dto';

export class UpdateReceptionistProfileDto extends PersonalDataDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  extension?: string | null;
}
