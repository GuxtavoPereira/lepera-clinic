import { Module } from '@nestjs/common';
import { ClinicalDocumentsController } from './clinical-documents.controller';
import { ClinicalDocumentsService } from './clinical-documents.service';

@Module({
  controllers: [ClinicalDocumentsController],
  providers: [ClinicalDocumentsService],
  exports: [ClinicalDocumentsService],
})
export class ClinicalDocumentsModule {}
