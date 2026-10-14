import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient-data.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RECEPTIONIST') // recepção também cadastra e edita pacientes
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientsService.create(dto);
  }

  // GET /api/patients?search=maria&page=1&pageSize=20
  @Get()
  findAll(@Query() query: ListPatientsQueryDto) {
    return this.patientsService.findAll(query);
  }

  // GET /api/patients/mine — pacientes atendidos pelo profissional logado.
  // Declarado ANTES de ":id" para "mine" não ser lido como id.
  @Get('mine')
  @Roles('DOCTOR')
  findMine(
    @Query() query: ListPatientsQueryDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.patientsService.findForDoctor(req.user, query);
  }

  // PATCH /api/patients/me — o paciente edita o próprio perfil.
  // Declarado ANTES das rotas ":id" para "me" não ser lido como id.
  @Patch('me')
  @Roles('PATIENT')
  updateMine(@Body() dto: UpdatePatientDto, @Req() req: { user: AuthUser }) {
    return this.patientsService.updateMine(req.user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.patientsService.update(id, dto);
  }
}
