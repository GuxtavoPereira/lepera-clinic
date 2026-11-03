import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import {
  GoogleIdentityVerifier,
  GooglePreviewService,
} from './google-preview.service';
import {
  GooglePreviewAuthController,
  GooglePreviewCalendarController,
  GooglePreviewGuard,
} from './google-preview.controller';

@Module({
  imports: [AppointmentsModule],
  controllers: [GooglePreviewAuthController, GooglePreviewCalendarController],
  providers: [GoogleIdentityVerifier, GooglePreviewService, GooglePreviewGuard],
})
export class GooglePreviewModule {}
