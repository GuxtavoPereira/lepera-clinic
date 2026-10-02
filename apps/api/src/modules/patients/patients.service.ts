import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  async create(dto: CreatePatientDto) {
    return this.prisma.db.$transaction(async (tx) => {
      const user = await this.users.create(
        {
          name: dto.name,
          email: dto.email,
          password: dto.password,
          role: 'PATIENT',
        },
        tx,
      );

      const patient = await tx.patient.create({
        data: {
          userId: user.id,
          insuranceProvider: dto.insuranceProvider,
          insuranceNumber: dto.insuranceNumber,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          responsibleDoctorId: dto.responsibleDoctorId,
        },
      });

      return { ...user, patient };
    });
  }

  findAll() {
    return this.prisma.db.patient.findMany({
      include: { user: { omit: { passwordHash: true } } },
      orderBy: { user: { name: 'asc' } },
    });
  }

  findOne(id: string) {
    return this.prisma.db.patient.findUnique({
      where: { id },
      include: { user: { omit: { passwordHash: true } } },
    });
  }
}
