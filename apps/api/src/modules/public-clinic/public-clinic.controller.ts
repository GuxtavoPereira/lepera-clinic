import { Controller, Get } from '@nestjs/common';
import { PublicClinicService } from './public-clinic.service';

@Controller('public/clinic')
export class PublicClinicController {
  constructor(private readonly clinic: PublicClinicService) {}

  @Get('team')
  team() {
    return this.clinic.team();
  }
}
