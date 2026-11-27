import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles, StrictRoles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

type ReviewReq = Request & { user: AuthUser };

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('mine')
  @Roles('PATIENT')
  @StrictRoles()
  @Header('Cache-Control', 'private, no-store')
  findMine(@Req() req: ReviewReq) {
    return this.reviews.findMine(req.user);
  }

  @Get('summary')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DOCTOR')
  @Header('Cache-Control', 'private, no-store')
  summary(@Req() req: ReviewReq) {
    return this.reviews.aggregateSummary(req.user);
  }

  @Get('appointment/:appointmentId')
  @Roles('PATIENT')
  @StrictRoles()
  @Header('Cache-Control', 'private, no-store')
  getForAppointment(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Req() req: ReviewReq,
  ) {
    return this.reviews.getForAppointment(appointmentId, req.user);
  }

  @Post('appointment/:appointmentId')
  @Roles('PATIENT')
  @StrictRoles()
  create(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() dto: CreateReviewDto,
    @Req() req: ReviewReq,
  ) {
    return this.reviews.create(
      appointmentId,
      dto,
      req.user,
      requestContext(req),
    );
  }
}
