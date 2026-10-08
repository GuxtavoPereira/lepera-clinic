import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
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

  @Get(':id')
  @Roles('ADMIN', 'RECEPTIONIST', 'PATIENT', 'DOCTOR')
  findOne(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }
}
