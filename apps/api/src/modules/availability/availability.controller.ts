import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import { AvailabilityService } from './availability.service';
import { ReplaceAvailabilityDto } from './dto/replace-availability.dto';

type Req = {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  // GET /api/availability/mine — grade semanal do profissional logado
  @Get('mine')
  @Roles('DOCTOR')
  findMine(@Req() req: Req) {
    return this.availability.findMine(req.user);
  }

  // PUT /api/availability/mine — substitui a grade semanal
  @Put('mine')
  @Roles('DOCTOR')
  replaceMine(@Body() dto: ReplaceAvailabilityDto, @Req() req: Req) {
    return this.availability.replaceMine(req.user, dto, requestContext(req));
  }

  // GET /api/availability/doctor/:doctorId — consulta (agendamento)
  @Get('doctor/:doctorId')
  @Roles('ADMIN', 'RECEPTIONIST', 'PATIENT', 'DOCTOR')
  findForDoctor(@Param('doctorId') doctorId: string) {
    return this.availability.findForDoctor(doctorId);
  }
}
