import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { ListAppointmentsQueryDto } from './dto/list-appointments-query.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentsService } from './appointments.service';
import { AppointmentCalendarService } from './appointment-calendar.service';
import { CalendarQueryDto } from './dto/calendar-query.dto';

type AuditRequest = Parameters<typeof requestContext>[0] & { user: AuthUser };

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RECEPTIONIST')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly calendarService: AppointmentCalendarService,
  ) {}

  @Get('calendar')
  @Roles('ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  calendar(
    @Query() query: CalendarQueryDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.calendarService.calendar(query, request.user);
  }

  @Get('available-slots')
  @Roles('ADMIN', 'RECEPTIONIST', 'SUPER_ADMIN', 'DOCTOR', 'PATIENT')
  availableSlots(
    @Query() query: CalendarQueryDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.calendarService.availableSlots(query, request.user);
  }

  // GET /api/appointments?scope=upcoming&status=SCHEDULED&page=1&pageSize=10
  @Get()
  findAll(@Query() query: ListAppointmentsQueryDto) {
    return this.appointmentsService.findAll(query);
  }

  @Get('mine')
  @Roles('PATIENT', 'DOCTOR')
  findMine(@Req() request: { user: AuthUser }) {
    return this.appointmentsService.findMine(request.user);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAppointmentDto, @Req() request: AuditRequest) {
    return this.appointmentsService.create(
      dto,
      request.user,
      requestContext(request),
    );
  }

  @Patch(':id/cancel')
  @Roles('ADMIN', 'RECEPTIONIST', 'PATIENT')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
    @Req() request: AuditRequest,
  ) {
    return this.appointmentsService.cancel(
      id,
      dto,
      request.user,
      requestContext(request),
    );
  }

  @Patch(':id/reschedule')
  @Roles('ADMIN', 'RECEPTIONIST')
  reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleAppointmentDto,
    @Req() request: AuditRequest,
  ) {
    return this.appointmentsService.reschedule(
      id,
      dto,
      request.user,
      requestContext(request),
    );
  }
}
