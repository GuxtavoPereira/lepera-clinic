import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ScheduleRequestsController } from './schedule-requests.controller';
import { ScheduleRequestsService } from './schedule-requests.service';

@Module({
  imports: [AppointmentsModule],
  controllers: [ScheduleRequestsController],
  providers: [ScheduleRequestsService],
})
export class ScheduleRequestsModule {}
