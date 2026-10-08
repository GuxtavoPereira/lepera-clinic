import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApproveScheduleRequestDto } from './dto/approve-schedule-request.dto';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';
import { ScheduleRequestsService } from './schedule-requests.service';

@Controller('schedule-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScheduleRequestsController {
  constructor(private readonly scheduleRequests: ScheduleRequestsService) {}

  @Post()
  @Roles('PATIENT')
  create(
    @Body() dto: CreateScheduleRequestDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.scheduleRequests.create(dto, request.user);
  }

  @Get('mine')
  @Roles('PATIENT')
  findMine(@Req() request: { user: AuthUser }) {
    return this.scheduleRequests.findMine(request.user);
  }

  @Get('pending')
  @Roles('RECEPTIONIST')
  findPending() {
    return this.scheduleRequests.findPending();
  }

  @Patch(':id/approve')
  @Roles('RECEPTIONIST')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveScheduleRequestDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.scheduleRequests.approve(id, dto, request.user);
  }

  @Patch(':id/reject')
  @Roles('RECEPTIONIST')
  reject(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.scheduleRequests.reject(id, request.user);
  }
}
