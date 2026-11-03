import { Module } from '@nestjs/common';
import { PublicClinicController } from './public-clinic.controller';
import { PublicClinicService } from './public-clinic.service';

@Module({
  controllers: [PublicClinicController],
  providers: [PublicClinicService],
})
export class PublicClinicModule {}
