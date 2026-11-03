import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ExportReportQueryDto, ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

type ReportRequest = Request & { user: AuthUser };

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RECEPTIONIST', 'DOCTOR', 'PATIENT')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  async preview(
    @Query() query: ReportQueryDto,
    @Req() req: ReportRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'private, no-store');
    return this.reports.preview(query, req.user);
  }

  @Get('export')
  async export(
    @Query() query: ExportReportQueryDto,
    @Req() req: ReportRequest,
    @Res() res: Response,
  ) {
    const file = await this.reports.export(query, req.user);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.buffer);
  }
}
