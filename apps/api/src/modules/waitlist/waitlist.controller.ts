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
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  CreateWaitlistEntryDto,
  UpdateWaitlistEntryDto,
} from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  // Recepção inclui um paciente; o paciente entra por conta própria
  @Post()
  @Roles('RECEPTIONIST', 'PATIENT')
  create(@Body() dto: CreateWaitlistEntryDto, @Req() req: { user: AuthUser }) {
    return this.waitlist.create(dto, req.user);
  }

  @Get()
  @Roles('RECEPTIONIST')
  findActive() {
    return this.waitlist.findActive();
  }

  // Declarado antes das rotas ":id"
  @Get('mine')
  @Roles('PATIENT')
  findMine(@Req() req: { user: AuthUser }) {
    return this.waitlist.findMine(req.user);
  }

  @Patch(':id/leave')
  @Roles('PATIENT')
  leave(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.waitlist.leave(id, req.user);
  }

  @Patch(':id')
  @Roles('RECEPTIONIST')
  update(@Param('id') id: string, @Body() dto: UpdateWaitlistEntryDto) {
    return this.waitlist.update(id, dto);
  }
}
