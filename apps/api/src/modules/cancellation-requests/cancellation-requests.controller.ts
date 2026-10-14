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
import { requestContext } from '../audit/request-context';
import { CancellationRequestsService } from './cancellation-requests.service';
import {
  ApproveCancellationRequestDto,
  CreateCancellationRequestDto,
  RejectCancellationRequestDto,
} from './dto/cancellation-request.dto';

type Req = {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

@Controller('cancellation-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CancellationRequestsController {
  constructor(private readonly requests: CancellationRequestsService) {}

  // O profissional pede o cancelamento de uma consulta sua
  @Post()
  @Roles('DOCTOR')
  create(@Body() dto: CreateCancellationRequestDto, @Req() req: Req) {
    return this.requests.create(dto, req.user, requestContext(req));
  }

  @Get('mine')
  @Roles('DOCTOR')
  findMine(@Req() req: Req) {
    return this.requests.findMine(req.user);
  }

  // Fila da recepção
  @Get('pending')
  @Roles('RECEPTIONIST')
  findPending() {
    return this.requests.findPending();
  }

  @Patch(':id/approve')
  @Roles('RECEPTIONIST')
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveCancellationRequestDto,
    @Req() req: Req,
  ) {
    return this.requests.approve(id, dto, req.user, requestContext(req));
  }

  @Patch(':id/reject')
  @Roles('RECEPTIONIST')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectCancellationRequestDto,
    @Req() req: Req,
  ) {
    return this.requests.reject(id, dto, req.user, requestContext(req));
  }
}
