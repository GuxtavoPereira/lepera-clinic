// apps/api/src/modules/doctors/doctors.service.ts
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { UsersService } from '../users/users.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async create(dto: CreateDoctorDto) {
    return this.prisma.db.$transaction(async (tx) => {
      const user = await this.users.create(
        {
          name: dto.name,
          cpf: dto.cpf,
          email: dto.email,
          password: dto.password,
          role: 'DOCTOR',
        },
        tx,
      );

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          licenseNumber: dto.licenseNumber,
          specialty: dto.specialty,
          clinicalApproach: dto.clinicalApproach,
          bio: dto.bio,
          room: dto.room,
        },
      });

      return { ...user, doctor };
    });
  }

  findAll() {
    return this.prisma.db.doctor.findMany({
      include: { user: { omit: { passwordHash: true } } },
      orderBy: { user: { name: 'asc' } },
    });
  }

  findOne(id: string) {
    return this.prisma.db.doctor.findUnique({
      where: { id },
      include: { user: { omit: { passwordHash: true } } },
    });
  }

  /** O profissional edita o próprio perfil. Registro (CRP/CRM) e especialidade
   *  só o admin altera. */
  async updateMine(user: AuthUser, dto: UpdateDoctorProfileDto) {
    const doctor = await this.prisma.db.doctor.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    try {
      await this.prisma.db.$transaction(async (tx) => {
        await this.users.updatePersonalData(
          user.sub,
          dto,
          { allowCpfChange: false },
          tx,
        );
        await tx.doctor.update({
          where: { id: doctor.id },
          data: {
            clinicalApproach: dto.clinicalApproach,
            bio: dto.bio,
            room: dto.room,
          },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe um cadastro com este CPF');
      }
      throw error;
    }

    return this.findOne(doctor.id);
  }
}
