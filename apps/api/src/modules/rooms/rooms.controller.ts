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
  CancelRoomReservationDto,
  CreateRoomDto,
  CreateRoomReservationDto,
  RoomCalendarQueryDto,
  UpdateRoomDto,
} from './dto/rooms.dto';
import { RoomsService } from './rooms.service';

type RoomRequest = Request & { user: AuthUser };

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  list(@Query('includeInactive') includeInactive?: string) {
    return this.rooms.listRooms(includeInactive === 'true');
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateRoomDto, @Req() req: RoomRequest) {
    return this.rooms.createRoom(dto, req.user, requestContext(req));
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoomDto,
    @Req() req: RoomRequest,
  ) {
    return this.rooms.updateRoom(id, dto, req.user, requestContext(req));
  }

  @Get('calendar')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  calendar(@Query() query: RoomCalendarQueryDto) {
    return this.rooms.calendar(query);
  }

  @Post('reservations')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  reserve(@Body() dto: CreateRoomReservationDto, @Req() req: RoomRequest) {
    return this.rooms.reserve(dto, req.user, requestContext(req));
  }

  @Patch('reservations/:id/cancel')
  @Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRoomReservationDto,
    @Req() req: RoomRequest,
  ) {
    return this.rooms.cancelReservation(id, dto, req.user, requestContext(req));
  }
}
