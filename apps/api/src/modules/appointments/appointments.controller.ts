import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RECEPTIONIST')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get('mine')
  @Roles('PATIENT', 'DOCTOR')
  findMine(@Req() request: { user: AuthUser }) {
    return this.appointmentsService.findMine(request.user);
  }

  @Post()
  create(
    @Body() dto: CreateAppointmentDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.appointmentsService.create(dto, request.user);
  }
}
