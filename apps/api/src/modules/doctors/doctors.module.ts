// apps/api/src/modules/doctors/doctors.module.ts
import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';

@Module({
  imports: [UsersModule],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
