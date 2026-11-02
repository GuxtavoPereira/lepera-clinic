import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import {
  CreateInventoryItemDto,
  CreateStockMovementDto,
  InventoryPageDto,
  ListInventoryDto,
  UpdateInventoryItemDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

type InventoryRequest = Request & { user: AuthUser };

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('items')
  items(@Query() query: ListInventoryDto, @Req() req: InventoryRequest) {
    return this.inventory.findAll(query, req.user);
  }

  @Get('summary')
  summary(@Req() req: InventoryRequest) {
    return this.inventory.summary(req.user);
  }

  @Post('items')
  create(@Body() dto: CreateInventoryItemDto, @Req() req: InventoryRequest) {
    return this.inventory.create(dto, req.user, requestContext(req));
  }

  @Patch('items/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryItemDto,
    @Req() req: InventoryRequest,
  ) {
    return this.inventory.update(id, dto, req.user, requestContext(req));
  }

  @Get('items/:id/movements')
  movements(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: InventoryPageDto,
    @Req() req: InventoryRequest,
  ) {
    return this.inventory.movements(id, query, req.user);
  }

  @Post('items/:id/movements')
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStockMovementDto,
    @Req() req: InventoryRequest,
  ) {
    return this.inventory.move(id, dto, req.user, requestContext(req));
  }
}
