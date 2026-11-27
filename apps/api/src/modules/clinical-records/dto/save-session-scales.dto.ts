import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SessionScaleItemDto {
  @Transform(trim)
  @IsString()
  @MinLength(2, { message: 'Informe o nome da escala (mínimo 2 caracteres)' })
  @MaxLength(80)
  name!: string;

  @Type(() => Number)
  @IsInt({ message: 'O valor da escala deve ser um número inteiro' })
  @Min(1, { message: 'O valor mínimo da escala é 1' })
  @Max(10, { message: 'O valor máximo da escala é 10' })
  value!: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() || null : value,
  )
  @IsString()
  @MaxLength(500)
  observation?: string | null;
}

export class SaveSessionScalesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SessionScaleItemDto)
  scales!: SessionScaleItemDto[];
}
