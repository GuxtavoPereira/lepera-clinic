// apps/api/src/modules/users/users.controller.ts
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * Um CONTROLLER só cuida de HTTP: qual rota, qual verbo (GET/POST/PATCH),
 * pegar o que veio no corpo/parâmetro e devolver para o service. Repare que
 * nenhuma linha aqui embaixo fala com o banco — quem faz isso é o
 * UsersService.
 *
 * `@Controller('users')` faz TODA rota aqui dentro começar com /users
 * (e o main.ts já soma o prefixo /api na frente: /api/users).
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /api/users
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // GET /api/users
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  // GET /api/users/:id  → ex: /api/users/abc-123
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // PATCH /api/users/:id
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // PATCH /api/users/:id/deactivate
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivate(id);
  }
}
