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
  CancelFinancialDto,
  CreateFinancialDto,
  FinancialAppointmentQueryDto,
  FinancialQueryDto,
  ReopenFinancialDto,
  SettleFinancialDto,
  UpdateFinancialDto,
} from './dto/financial.dto';
import { FinancialService } from './financial.service';

type FinancialRequest = Request & { user: AuthUser };

@Controller('financial')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RECEPTIONIST')
export class FinancialController {
  constructor(private readonly financial: FinancialService) {}

  @Get()
  findAll(@Query() query: FinancialQueryDto, @Req() req: FinancialRequest) {
    return this.financial.findAll(query, req.user);
  }

  @Get('summary')
  summary(@Query() query: FinancialQueryDto, @Req() req: FinancialRequest) {
    return this.financial.summary(query, req.user);
  }

  @Get('export')
  export(@Query() query: FinancialQueryDto, @Req() req: FinancialRequest) {
    return this.financial.export(query, req.user);
  }

  @Get('appointments')
  appointments(
    @Query() query: FinancialAppointmentQueryDto,
    @Req() req: FinancialRequest,
  ) {
    return this.financial.appointments(query, req.user);
  }

  @Post()
  create(@Body() dto: CreateFinancialDto, @Req() req: FinancialRequest) {
    return this.financial.create(dto, req.user, requestContext(req));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinancialDto,
    @Req() req: FinancialRequest,
  ) {
    return this.financial.update(id, dto, req.user, requestContext(req));
  }

  @Patch(':id/settle')
  settle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleFinancialDto,
    @Req() req: FinancialRequest,
  ) {
    return this.financial.settle(id, dto, req.user, requestContext(req));
  }

  @Patch(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelFinancialDto,
    @Req() req: FinancialRequest,
  ) {
    return this.financial.cancel(id, dto, req.user, requestContext(req));
  }

  @Patch(':id/reopen')
  @Roles('ADMIN')
  reopen(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReopenFinancialDto,
    @Req() req: FinancialRequest,
  ) {
    return this.financial.reopen(id, dto, req.user, requestContext(req));
  }
}
