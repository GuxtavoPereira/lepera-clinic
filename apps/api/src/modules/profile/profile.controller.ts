import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { requestContext } from '../audit/request-context';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ProfileService } from './profile.service';
import { UsersService } from '../users/users.service';
import { SocialNameDto } from '../users/dto/social-name.dto';

type Req = {
  user: AuthUser;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

// Qualquer usuário autenticado, sempre sobre a PRÓPRIA conta.
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly users: UsersService,
  ) {}

  @Patch('me/name-preference')
  updateNamePreference(@Body() dto: SocialNameDto, @Req() req: Req) {
    return this.users.updatePersonalData(req.user.sub, dto, {
      allowCpfChange: false,
    });
  }

  // GET /api/profile/me
  @Get('me')
  getMe(@Req() req: Req) {
    return this.profile.getMe(req.user);
  }

  // PATCH /api/profile/me/password
  @Patch('me/password')
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: Req) {
    return this.profile.changePassword(req.user, dto, requestContext(req));
  }
}
