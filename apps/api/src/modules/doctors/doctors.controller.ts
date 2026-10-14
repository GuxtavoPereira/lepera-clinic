import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('doctors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateDoctorDto) {
    return this.doctorsService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'RECEPTIONIST', 'PATIENT', 'DOCTOR')
  findAll() {
    return this.doctorsService.findAll();
  }

  // PATCH /api/doctors/me — antes de ":id" para "me" não virar id
  @Patch('me')
  @Roles('DOCTOR')
  updateMine(
    @Body() dto: UpdateDoctorProfileDto,
    @Req() req: { user: AuthUser },
  ) {
    return this.doctorsService.updateMine(req.user, dto);
  }

  @Get(':id')
  @Roles('ADMIN', 'RECEPTIONIST', 'PATIENT', 'DOCTOR')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }
}
