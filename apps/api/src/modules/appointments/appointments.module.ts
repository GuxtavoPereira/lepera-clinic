import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AppointmentCalendarService } from './appointment-calendar.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentCalendarService],
  exports: [AppointmentsService, AppointmentCalendarService],
})
export class AppointmentsModule {}
