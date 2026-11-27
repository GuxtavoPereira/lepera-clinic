import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import {
  AddDependentDto,
  PortalCancelAppointmentDto,
  PortalScheduleRequestDto,
} from './dto/guardian-portal.dto';
import { GuardianPortalService } from './guardian-portal.service';

type PortalRequest = Request & { user: AuthUser };

@Controller('portal')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuardianPortalController {
  constructor(private readonly portal: GuardianPortalService) {}

  @Get('patients')
  @Roles('GUARDIAN', 'PATIENT')
  @Header('Cache-Control', 'private, no-store')
  listPatients(@Req() req: PortalRequest) {
    return this.portal.listAccessiblePatients(req.user);
  }

  @Post('dependents')
  @Roles('GUARDIAN', 'PATIENT')
  addDependent(@Body() dto: AddDependentDto, @Req() req: PortalRequest) {
    return this.portal.addDependent(dto, req.user, requestContext(req));
  }

  @Get('patients/:patientId/appointments')
  @Roles('GUARDIAN', 'PATIENT')
  @Header('Cache-Control', 'private, no-store')
  listAppointments(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: PortalRequest,
  ) {
    return this.portal.listAppointments(patientId, req.user);
  }

  @Get('patients/:patientId/schedule-requests')
  @Roles('GUARDIAN', 'PATIENT')
  @Header('Cache-Control', 'private, no-store')
  listScheduleRequests(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: PortalRequest,
  ) {
    return this.portal.listScheduleRequests(patientId, req.user);
  }

  @Post('patients/:patientId/schedule-requests')
  @Roles('GUARDIAN', 'PATIENT')
  createScheduleRequest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: PortalScheduleRequestDto,
    @Req() req: PortalRequest,
  ) {
    return this.portal.createScheduleRequest(
      patientId,
      dto,
      req.user,
      requestContext(req),
    );
  }

  @Patch('patients/:patientId/appointments/:appointmentId/cancel')
  @Roles('GUARDIAN', 'PATIENT')
  cancelAppointment(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: PortalCancelAppointmentDto,
    @Req() req: PortalRequest,
  ) {
    return this.portal.cancelAppointment(
      patientId,
      appointmentId,
      dto,
      req.user,
      requestContext(req),
    );
  }

  @Get('patients/:patientId/feedback')
  @Roles('GUARDIAN', 'PATIENT')
  @Header('Cache-Control', 'private, no-store')
  listFeedback(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: PortalRequest,
  ) {
    return this.portal.listGuardianFeedback(
      patientId,
      req.user,
      requestContext(req),
    );
  }

  @Get('patients/:patientId/feedback/:docId')
  @Roles('GUARDIAN', 'PATIENT')
  @Header('Cache-Control', 'private, no-store')
  getFeedback(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: PortalRequest,
  ) {
    return this.portal.getGuardianFeedback(
      patientId,
      docId,
      req.user,
      requestContext(req),
    );
  }

  @Get('patients/:patientId/feedback/:docId/export')
  @Roles('GUARDIAN', 'PATIENT')
  async exportFeedbackPdf(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: PortalRequest,
    @Res() res: Response,
  ) {
    const file = await this.portal.exportGuardianFeedbackPdf(
      patientId,
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

  @Patch('links/:linkId/revoke')
  @Roles('ADMIN', 'RECEPTIONIST')
  revokeLink(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Req() req: PortalRequest,
  ) {
    return this.portal.revokeLink(linkId, req.user, requestContext(req));
  }
}
