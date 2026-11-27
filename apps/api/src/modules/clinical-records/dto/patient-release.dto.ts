import { IsBoolean } from 'class-validator';

export class SetPatientReleaseDto {
  @IsBoolean()
  released!: boolean;
}
