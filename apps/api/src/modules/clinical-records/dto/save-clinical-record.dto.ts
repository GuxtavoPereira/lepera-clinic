import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class SaveClinicalRecordDto {
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  mainComplaint?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  clinicalNotes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  homework?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  diagnosticHypothesis?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cid10?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  dsm5?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  approachUsed?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  therapeuticPlan?: string | null;

  @IsOptional()
  @IsDateString()
  nextSessionDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nextSessionRoom?: string | null;
}
