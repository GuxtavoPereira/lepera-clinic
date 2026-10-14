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
import { DoctorsModule } from './modules/doctors/doctors.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ReceptionistsModule } from './modules/receptionists/receptionists.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { ScheduleRequestsModule } from './modules/schedule-requests/schedule-requests.module';
import { CancellationRequestsModule } from './modules/cancellation-requests/cancellation-requests.module';
import { ClinicalRecordsModule } from './modules/clinical-records/clinical-records.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
    PrismaModule,
    CryptoModule,
    AuditModule,
    UsersModule,
    AuthModule,
    DoctorsModule,
    PatientsModule,
    ReceptionistsModule,
    AppointmentsModule,
    ScheduleRequestsModule,
    CancellationRequestsModule,
    ClinicalRecordsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
