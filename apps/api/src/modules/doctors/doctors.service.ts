// apps/api/src/modules/doctors/doctors.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';

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
}
