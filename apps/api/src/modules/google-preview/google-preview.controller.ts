import {
  Body,
  CanActivate,
  Controller,
  ExecutionContext,
  Get,
  Headers,
  Injectable,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
  Header,
} from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import {
  RateLimit,
  RateLimitGuard,
} from '../../common/guards/rate-limit.guard';
import { CalendarQueryDto } from '../appointments/dto/calendar-query.dto';
import { GooglePreviewService } from './google-preview.service';

export class GoogleCredentialDto {
  @IsString() @MinLength(1) @MaxLength(10000) credential!: string;
  @IsString() @MinLength(1) @MaxLength(4000) challenge!: string;
}

@Injectable()
export class GooglePreviewGuard implements CanActivate {
  constructor(private readonly preview: GooglePreviewService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string } }>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException(
        'Entre com Google para consultar horários.',
      );
    await this.preview.verifySession(token);
    return true;
  }
}

@Controller('auth/google')
@UseGuards(RateLimitGuard)
export class GooglePreviewAuthController {
  constructor(private readonly preview: GooglePreviewService) {}
  @Get('config')
  @Header('Cache-Control', 'no-store')
  config() {
    return this.preview.configuration();
  }
  @Post('challenge')
  @RateLimit({ name: 'google-challenge', limit: 30, windowMs: 15 * 60_000 })
  challenge(@Headers('origin') origin?: string) {
    return this.preview.challenge(origin);
  }
  @Post('preview')
  @RateLimit({ name: 'google-preview', limit: 15, windowMs: 15 * 60_000 })
  session(
    @Body() dto: GoogleCredentialDto,
    @Headers('origin') origin?: string,
  ) {
    return this.preview.createSession(dto.credential, dto.challenge, origin);
  }
}

@Controller('preview')
@UseGuards(GooglePreviewGuard, RateLimitGuard)
export class GooglePreviewCalendarController {
  constructor(private readonly preview: GooglePreviewService) {}
  @Get('doctors')
  @Header('Cache-Control', 'no-store')
  doctors() {
    return this.preview.doctors();
  }
  @Get('slots')
  @Header('Cache-Control', 'no-store')
  @RateLimit({ name: 'preview-slots', limit: 120, windowMs: 60_000 })
  slots(@Query() query: CalendarQueryDto) {
    return this.preview.slots(query);
  }
}
