import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import {
  CreateGuidanceMessageDto,
  ListSentGuidanceMessagesDto,
} from './dto/guidance-message.dto';
import { GuidanceMessagesService } from './guidance-messages.service';

type GuidanceRequest = Request & { user: AuthUser };

@Controller('guidance-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuidanceMessagesController {
  constructor(private readonly guidance: GuidanceMessagesService) {}

  @Post()
  @Roles('DOCTOR')
  @Header('Cache-Control', 'private, no-store')
  send(@Body() dto: CreateGuidanceMessageDto, @Req() req: GuidanceRequest) {
    return this.guidance.send(dto, req.user, requestContext(req));
  }

  @Get('sent')
  @Roles('DOCTOR')
  @Header('Cache-Control', 'private, no-store')
  sent(
    @Query() query: ListSentGuidanceMessagesDto,
    @Req() req: GuidanceRequest,
  ) {
    return this.guidance.findSent(query, req.user);
  }

  @Get('mine')
  @Roles('PATIENT')
  @Header('Cache-Control', 'private, no-store')
  mine(@Req() req: GuidanceRequest) {
    return this.guidance.findMine(req.user);
  }

  @Patch(':id/read')
  @Roles('PATIENT')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: GuidanceRequest,
  ) {
    return this.guidance.markRead(id, req.user);
  }
}
