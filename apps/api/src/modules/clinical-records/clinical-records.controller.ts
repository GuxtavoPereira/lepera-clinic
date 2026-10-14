import {
  Body,
  Controller,
  Get,
  Param,
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
  findMine(@Req() req: Req) {
    return this.records.findMine(req.user);
  }

  // GET /api/clinical-records/by-appointment/:appointmentId
  @Get('by-appointment/:appointmentId')
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
}
