import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ReceptionistsService } from './receptionists.service';
import { CreateReceptionistDto } from './dto/create-receptionist.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('receptionists')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReceptionistsController {
  constructor(private readonly receptionistsService: ReceptionistsService) {}

  @Post()
  create(@Body() dto: CreateReceptionistDto) {
    return this.receptionistsService.create(dto);
  }

  @Get()
  findAll() {
    return this.receptionistsService.findAll();
  }
}
