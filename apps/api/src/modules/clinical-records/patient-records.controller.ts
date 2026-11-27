import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles, StrictRoles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import { PatientRecordsService } from './patient-records.service';

type PatientReq = Request & { user: AuthUser };

/**
 * PRI-13: Consulta autenticada do próprio prontuário pelo paciente.
 * @StrictRoles() garante que apenas o próprio papel PATIENT acesse (nem ADMIN/SUPER_ADMIN/GUARDIAN).
 */
@Controller('patient-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
@StrictRoles()
export class PatientRecordsController {
  constructor(private readonly patientRecords: PatientRecordsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  listMine(@Req() req: PatientReq) {
    return this.patientRecords.listMine(req.user, requestContext(req));
  }

  @Get('sessions/:recordId')
  @Header('Cache-Control', 'private, no-store')
  getSession(
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Req() req: PatientReq,
  ) {
    return this.patientRecords.getSessionRecord(
      recordId,
      req.user,
      requestContext(req),
    );
  }

  @Get('documents/:docId')
  @Header('Cache-Control', 'private, no-store')
  getDocument(
    @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: PatientReq,
  ) {
    return this.patientRecords.getDocument(
      docId,
      req.user,
      requestContext(req),
    );
  }

  @Get('documents/:docId/export')
  async exportDocumentPdf(
    @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: PatientReq,
    @Res() res: Response,
  ) {
    const file = await this.patientRecords.exportDocumentPdf(
      docId,
      req.user,
      requestContext(req),
    );
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.buffer);
  }
}
