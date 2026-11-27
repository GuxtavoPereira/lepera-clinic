import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRoomDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class UpdateRoomDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  location?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  capacity?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RoomCalendarQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe from no formato AAAA-MM-DD',
  })
  from!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Informe to no formato AAAA-MM-DD',
  })
  to!: string;

  @IsOptional()
  @IsUUID()
  roomId?: string;
}

export class CreateRoomReservationDto {
  @IsUUID()
  roomId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  title!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'Informe o horário de início com fuso horário',
  })
  startDatetime!: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'Informe o horário de término com fuso horário',
  })
  endDatetime!: string;
}

export class CancelRoomReservationDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  reason?: string;
}
