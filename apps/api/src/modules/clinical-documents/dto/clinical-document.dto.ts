import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  clinicalDocumentStatuses,
  clinicalDocumentTypes,
  clinicalDocumentVisibilities,
  type ClinicalDocumentStatus,
  type ClinicalDocumentType,
  type ClinicalDocumentVisibility,
} from '@lepera/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ClinicalDocumentSectionDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  key!: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsString()
  @MaxLength(15000)
  value!: string;
}

export class ListClinicalDocumentsDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsIn(clinicalDocumentTypes)
  type?: ClinicalDocumentType;

  @IsOptional()
  @IsIn(clinicalDocumentStatuses)
  status?: ClinicalDocumentStatus;
}

export class CreateClinicalDocumentDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsIn(clinicalDocumentTypes)
  type!: ClinicalDocumentType;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ClinicalDocumentSectionDto)
  sections!: ClinicalDocumentSectionDto[];
}

export class UpdateClinicalDocumentDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ClinicalDocumentSectionDto)
  sections?: ClinicalDocumentSectionDto[];
}

export class UpdateClinicalDocumentVisibilityDto {
  @IsIn(clinicalDocumentVisibilities)
  visibility!: ClinicalDocumentVisibility;
}
