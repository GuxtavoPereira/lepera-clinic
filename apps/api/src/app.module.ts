// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReceptionistsModule } from './modules/receptionists/receptionists.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ScheduleRequestsModule } from './modules/schedule-requests/schedule-requests.module';
import { CancellationRequestsModule } from './modules/cancellation-requests/cancellation-requests.module';
import { ClinicalRecordsModule } from './modules/clinical-records/clinical-records.module';
import { ClinicalDocumentsModule } from './modules/clinical-documents/clinical-documents.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GuidanceMessagesModule } from './modules/guidance-messages/guidance-messages.module';
import { GuardianPortalModule } from './modules/guardian-portal/guardian-portal.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FinancialModule } from './modules/financial/financial.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { GooglePreviewModule } from './modules/google-preview/google-preview.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { PublicClinicModule } from './modules/public-clinic/public-clinic.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: (config) => envSchema.parse(config),
    }),
    PrismaModule,
    CryptoModule,
    AuditModule,
    UsersModule,
    AuthModule,
    ProfileModule,
    DoctorsModule,
    PatientsModule,
    ReceptionistsModule,
    AppointmentsModule,
    ScheduleRequestsModule,
    CancellationRequestsModule,
    ClinicalRecordsModule,
    ClinicalDocumentsModule,
    RoomsModule,
    GuidanceMessagesModule,
    GuardianPortalModule,
    AvailabilityModule,
    WaitlistModule,
    NotificationsModule,
    FinancialModule,
    InventoryModule,
    GooglePreviewModule,
    ReportsModule,
    ReviewsModule,
    PublicClinicModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
