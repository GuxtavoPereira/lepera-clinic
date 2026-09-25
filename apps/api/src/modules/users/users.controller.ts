// users.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ListUsersQuerySchema,
  SetUserStatusSchema,
  UpdateUserSchema,
} from '@lepera/contracts';
import type {
  ListUsersQuery,
  Paginated,
  SetUserStatusInput,
  UpdateUserInput,
  UserResponse,
} from '@lepera/contracts';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(ListUsersQuerySchema)) query: ListUsersQuery,
  ): Promise<Paginated<UserResponse>> {
    return this.users.findAll(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponse> {
    return this.users.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) body: UpdateUserInput,
  ): Promise<UserResponse> {
    return this.users.update(id, body);
  }

  @Patch(':id/status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(SetUserStatusSchema)) body: SetUserStatusInput,
  ): Promise<UserResponse> {
    return this.users.setActive(id, body.isActive);
  }
}
