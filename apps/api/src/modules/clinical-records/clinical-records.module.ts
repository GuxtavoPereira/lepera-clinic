import { Module } from '@nestjs/common';
import { ClinicalRecordsController } from './clinical-records.controller';
import { ClinicalRecordsService } from './clinical-records.service';
import { PatientRecordsController } from './patient-records.controller';
import { PatientRecordsService } from './patient-records.service';

@Module({
  controllers: [ClinicalRecordsController, PatientRecordsController],
  providers: [ClinicalRecordsService, PatientRecordsService],
})
export class ClinicalRecordsModule {}
