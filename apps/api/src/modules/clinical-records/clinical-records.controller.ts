import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles, StrictRoles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import { ClinicalRecordsService } from './clinical-records.service';
import { SetPatientReleaseDto } from './dto/patient-release.dto';
import { SaveClinicalRecordDto } from './dto/save-clinical-record.dto';

type Req = {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

// RN02: apenas o profissional. @StrictRoles() impede o "atalho" do super admin.
@Controller('clinical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
@StrictRoles()
export class ClinicalRecordsController {
  constructor(private readonly records: ClinicalRecordsService) {}

  // GET /api/clinical-records/mine → lista (só metadados)
  @Get('mine')
  @Header('Cache-Control', 'private, no-store')
  findMine(@Req() req: Req) {
    return this.records.findMine(req.user);
  }

  // GET /api/clinical-records/by-appointment/:appointmentId
  @Get('by-appointment/:appointmentId')
  @Header('Cache-Control', 'private, no-store')
  getByAppointment(
    @Param('appointmentId') appointmentId: string,
    @Req() req: Req,
  ) {
    return this.records.getByAppointment(
      appointmentId,
      req.user,
      requestContext(req),
    );
  }

  // PUT /api/clinical-records/by-appointment/:appointmentId → salva rascunho
  @Put('by-appointment/:appointmentId')
  save(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: SaveClinicalRecordDto,
    @Req() req: Req,
  ) {
    return this.records.save(appointmentId, dto, req.user, requestContext(req));
  }

  // POST /api/clinical-records/by-appointment/:appointmentId/sign
  @Post('by-appointment/:appointmentId/sign')
  sign(@Param('appointmentId') appointmentId: string, @Req() req: Req) {
    return this.records.sign(appointmentId, req.user, requestContext(req));
  }

  // PATCH /api/clinical-records/by-appointment/:appointmentId/patient-release (PRI-13)
  @Patch('by-appointment/:appointmentId/patient-release')
  @Header('Cache-Control', 'private, no-store')
  setPatientRelease(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: SetPatientReleaseDto,
    @Req() req: Req,
  ) {
    return this.records.setPatientRelease(
      appointmentId,
      dto.released,
      req.user,
      requestContext(req),
    );
  }

  // GET /api/clinical-records/patient-summary/:patientId (PRI-14)
  @Get('patient-summary/:patientId')
  @Header('Cache-Control', 'private, no-store')
  patientSummary(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Req() req: Req,
  ) {
    return this.records.getPatientParagraphSummary(
      patientId,
      req.user,
      requestContext(req),
    );
  }
}
