import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

// Qualquer usuário autenticado, sempre sobre as PRÓPRIAS notificações.
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findMine(@Req() req: { user: AuthUser }) {
    return this.notifications.findMine(req.user);
  }

  @Get('unread-count')
  unreadCount(@Req() req: { user: AuthUser }) {
    return this.notifications.unreadCount(req.user);
  }

  @Patch('read-all')
  markAllRead(@Req() req: { user: AuthUser }) {
    return this.notifications.markAllRead(req.user);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: { user: AuthUser }) {
    return this.notifications.markRead(id, req.user);
  }
}
