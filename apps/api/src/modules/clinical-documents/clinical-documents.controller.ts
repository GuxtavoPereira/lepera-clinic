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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { requestContext } from '../audit/request-context';
import {
  CreateClinicalDocumentDto,
  ListClinicalDocumentsDto,
  UpdateClinicalDocumentDto,
  UpdateClinicalDocumentVisibilityDto,
} from './dto/clinical-document.dto';
import { ClinicalDocumentsService } from './clinical-documents.service';

type DocRequest = Request & { user: AuthUser };

/**
 * Documentos clínicos do profissional (PRI-06).
 * Restrito ao papel DOCTOR e limitado ao autor vinculado ao paciente.
 */
@Controller('clinical-documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('DOCTOR')
export class ClinicalDocumentsController {
  constructor(private readonly documents: ClinicalDocumentsService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  findMine(@Query() query: ListClinicalDocumentsDto, @Req() req: DocRequest) {
    return this.documents.findMine(query, req.user);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: DocRequest) {
    return this.documents.findOne(id, req.user, requestContext(req));
  }

  @Post()
  @Header('Cache-Control', 'private, no-store')
  create(@Body() dto: CreateClinicalDocumentDto, @Req() req: DocRequest) {
    return this.documents.create(dto, req.user, requestContext(req));
  }

  @Patch(':id')
  @Header('Cache-Control', 'private, no-store')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicalDocumentDto,
    @Req() req: DocRequest,
  ) {
    return this.documents.update(id, dto, req.user, requestContext(req));
  }

  @Post(':id/sign')
  @Header('Cache-Control', 'private, no-store')
  sign(@Param('id', ParseUUIDPipe) id: string, @Req() req: DocRequest) {
    return this.documents.sign(id, req.user, requestContext(req));
  }

  @Post(':id/revise')
  @Header('Cache-Control', 'private, no-store')
  revise(@Param('id', ParseUUIDPipe) id: string, @Req() req: DocRequest) {
    return this.documents.revise(id, req.user, requestContext(req));
  }

  @Patch(':id/visibility')
  @Header('Cache-Control', 'private, no-store')
  updateVisibility(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClinicalDocumentVisibilityDto,
    @Req() req: DocRequest,
  ) {
    return this.documents.updateVisibility(
      id,
      dto,
      req.user,
      requestContext(req),
    );
  }

  @Get(':id/export')
  async exportPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: DocRequest,
    @Res() res: Response,
  ) {
    const file = await this.documents.exportPdf(
      id,
      req.user,
      requestContext(req),
    );
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
