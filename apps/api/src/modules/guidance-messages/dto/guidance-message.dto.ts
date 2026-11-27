import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  guidanceMessageCategories,
  type GuidanceMessageCategory,
} from '@lepera/contracts';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ListSentGuidanceMessagesDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;
}

export class CreateGuidanceMessageDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsIn(guidanceMessageCategories)
  category!: GuidanceMessageCategory;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @Transform(trim)
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  body!: string;
}
