import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordService } from './password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
  ) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await this.passwords.hash(dto.password);

    return this.prisma.db.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
      omit: { passwordHash: true },
    });
  }

  findAll() {
    return this.prisma.db.user.findMany({
      omit: { passwordHash: true },
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.db.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
    });
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.db.user.update({
      where: { id },
      data: dto,
      omit: { passwordHash: true },
    });
  }
  deactivate(id: string) {
    return this.prisma.db.user.update({
      where: { id },
      data: { isActive: false },
      omit: { passwordHash: true },
    });
  }

  findByEmailWithPassword(email: string) {
    return this.prisma.db.user.findUnique({ where: { email } });
  }
}
