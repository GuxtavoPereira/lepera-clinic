import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import {
  RateLimit,
  RateLimitGuard,
} from '../../common/guards/rate-limit.guard';
import { requestContext } from '../audit/request-context';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterGuardianDto } from './dto/register-guardian.dto';
import { RegisterPatientDto } from './dto/register.dto';
import { PasswordRecoveryService } from './password-recovery.service';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/password-recovery.dto';

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly recovery: PasswordRecoveryService,
  ) {}

  @Post('forgot-password')
  @RateLimit({
    name: 'forgot-password',
    limit: 5,
    windowMs: 15 * 60_000,
    byEmail: true,
  })
  forgot(@Body() dto: ForgotPasswordDto) {
    return this.recovery.forgot(dto.email);
  }

  @Post('reset-password')
  @RateLimit({ name: 'reset-password', limit: 10, windowMs: 15 * 60_000 })
  reset(@Body() dto: ResetPasswordDto) {
    return this.recovery.reset(dto.token, dto.password);
  }

  // POST /api/auth/login — 10 tentativas / 15 min por IP e por e-mail
  @Post('login')
  @RateLimit({ name: 'login', limit: 10, windowMs: 15 * 60_000, byEmail: true })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // POST /api/auth/register — cadastro público do PACIENTE (sem token).
  // 5 cadastros / hora por IP (e por e-mail) para frear robôs.
  @Post('register')
  @RateLimit({
    name: 'register',
    limit: 5,
    windowMs: 60 * 60_000,
    byEmail: true,
  })
  register(@Body() dto: RegisterPatientDto) {
    return this.auth.register(dto);
  }

  // POST /api/auth/register-guardian — cadastro público do RESPONSÁVEL + dependente menor.
  @Post('register-guardian')
  @RateLimit({
    name: 'register-guardian',
    limit: 5,
    windowMs: 60 * 60_000,
    byEmail: true,
  })
  registerGuardian(@Body() dto: RegisterGuardianDto, @Req() req: Request) {
    return this.auth.registerGuardian(dto, requestContext(req));
  }

  // POST /api/auth/logout — revoga o token atual no servidor via sessionVersion (SEC-01).
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(@Req() req: Request & { user: AuthUser }) {
    return this.auth.logout(req.user, requestContext(req));
  }
}
