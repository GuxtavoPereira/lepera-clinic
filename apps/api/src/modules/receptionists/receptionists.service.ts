import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { UsersService } from '../users/users.service';
import { CreateReceptionistDto } from './dto/create-receptionist.dto';
import { UpdateReceptionistProfileDto } from './dto/update-receptionist-profile.dto';

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
          cpf: dto.cpf,
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

  async updateMine(user: AuthUser, dto: UpdateReceptionistProfileDto) {
    const receptionist = await this.prisma.db.receptionist.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!receptionist) {
      throw new NotFoundException('Perfil de recepcionista não encontrado');
    }

    try {
      await this.prisma.db.$transaction(async (tx) => {
        await this.users.updatePersonalData(
          user.sub,
          dto,
          { allowCpfChange: false },
          tx,
        );
        await tx.receptionist.update({
          where: { id: receptionist.id },
          data: { extension: dto.extension },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe um cadastro com este CPF');
      }
      throw error;
    }

    return this.prisma.db.receptionist.findUnique({
      where: { id: receptionist.id },
      include: { user: { omit: { passwordHash: true } } },
    });
  }
}
