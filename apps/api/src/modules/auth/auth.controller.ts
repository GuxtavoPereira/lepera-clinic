import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  RateLimit,
  RateLimitGuard,
} from '../../common/guards/rate-limit.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
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
}
