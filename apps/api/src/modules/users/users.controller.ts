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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  JwtAuthGuard,
  type AuthUser,
} from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/users  → cria o usuário + o perfil do papel (Doctor/Patient/Receptionist).
  // Criar ADMIN exige SUPER_ADMIN (checado no service).
  @Post()
  create(@Body() dto: CreateUserDto, @Req() request: { user: AuthUser }) {
    return this.usersService.createWithProfile(dto, request.user);
  }

  // GET /api/users
  @Get()
  findAll(@Req() request: { user: AuthUser }) {
    return this.usersService.findAll(request.user);
  }

  // GET /api/users/:id  → ex: /api/users/abc-123
  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.usersService.findOne(id, request.user);
  }

  // PATCH /api/users/:id
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: { user: AuthUser },
  ) {
    return this.usersService.update(id, dto, request.user);
  }

  // PATCH /api/users/:id/deactivate
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @Req() request: { user: AuthUser }) {
    return this.usersService.deactivate(id, request.user);
  }
}
