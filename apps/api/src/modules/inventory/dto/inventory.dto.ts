import { Transform, Type } from 'class-transformer';
import {
  inventoryCategories,
  psychologicalTestMaterials,
  type InventoryCategory,
  type PsychologicalTestMaterial,
} from '@lepera/contracts';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const provided = (_: unknown, value: unknown) => value !== undefined;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class InventoryPageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}

export class ListInventoryDto extends InventoryPageDto {
  @ValidateIf(provided)
  @IsIn(inventoryCategories)
  category?: InventoryCategory;

  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  search?: string;

  @ValidateIf(provided)
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  lowStock?: boolean;
}

class InventorySpecificationDto {
  @ValidateIf(provided)
  @IsIn(inventoryCategories)
  category?: InventoryCategory;

  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  testEdition?: string;

  @ValidateIf(provided)
  @IsIn(psychologicalTestMaterials)
  testMaterial?: PsychologicalTestMaterial;
}

export class CreateInventoryItemDto extends InventorySpecificationDto {
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsInt()
  @Min(0)
  @Max(1000000)
  minimumStock: number = 5;
}

export class UpdateInventoryItemDto extends InventorySpecificationDto {
  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name?: string;

  @ValidateIf(provided)
  @Transform(trim)
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateIf(provided)
  @IsInt()
  @Min(0)
  @Max(1000000)
  minimumStock?: number;
}

export class CreateStockMovementDto {
  @IsIn(['ENTRY', 'EXIT'])
  movementType!: 'ENTRY' | 'EXIT';

  @IsInt()
  @Min(1)
  @Max(1000000)
  quantity!: number;

  @Transform(trim)
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  justification!: string;
}
