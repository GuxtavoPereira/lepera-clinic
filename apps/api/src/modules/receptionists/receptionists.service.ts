import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateReceptionistDto } from './dto/create-receptionist.dto';

@Injectable()
export class ReceptionistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async create(dto: CreateReceptionistDto) {
    return this.prisma.db.$transaction(async (tx) => {
      const user = await this.users.create(
        {
          name: dto.name,
          email: dto.email,
          password: dto.password,
          role: 'RECEPTIONIST',
        },
        tx,
      );

      const receptionist = await tx.receptionist.create({
        data: { userId: user.id, extension: dto.extension },
      });

      return { ...user, receptionist };
    });
  }

  findAll() {
    return this.prisma.db.receptionist.findMany({
      include: { user: { omit: { passwordHash: true } } },
      orderBy: { user: { name: 'asc' } },
    });
  }
}
