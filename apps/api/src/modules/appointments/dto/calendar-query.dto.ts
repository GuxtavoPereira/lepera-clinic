import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Civil dates at the clinic: [from, to), with a maximum of 42 days. */
export class CalendarQueryDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from deve usar AAAA-MM-DD' })
  from!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to deve usar AAAA-MM-DD' })
  to!: string;

  @ValidateIf(
    (_object: CalendarQueryDto, value: unknown) => value !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  doctorId?: string;
}
