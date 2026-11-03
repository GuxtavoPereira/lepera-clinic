import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PublicClinicService {
  constructor(private readonly prisma: PrismaService) {}

  async team() {
    const [doctors, receptionists] = await Promise.all([
      this.prisma.db.doctor.findMany({
        where: { user: { isActive: true, role: 'DOCTOR' } },
        select: {
          id: true,
          specialty: true,
          clinicalApproach: true,
          bio: true,
          licenseNumber: true,
          user: { select: { name: true, photoUrl: true } },
        },
        orderBy: [{ user: { name: 'asc' } }, { id: 'asc' }],
        take: 100,
      }),
      this.prisma.db.receptionist.findMany({
        where: { user: { isActive: true, role: 'RECEPTIONIST' } },
        select: { id: true, user: { select: { name: true, photoUrl: true } } },
        orderBy: [{ user: { name: 'asc' } }, { id: 'asc' }],
        take: 100,
      }),
    ]);

    // Keep this public response explicit, even if an internal query gains fields later.
    return {
      doctors: doctors.map((doctor) => ({
        id: doctor.id,
        name: doctor.user.name,
        specialty: doctor.specialty,
        clinicalApproach: doctor.clinicalApproach,
        bio: doctor.bio,
        licenseNumber: doctor.licenseNumber,
        photoUrl: doctor.user.photoUrl,
      })),
      receptionists: receptionists.map((receptionist) => ({
        id: receptionist.id,
        name: receptionist.user.name,
        photoUrl: receptionist.user.photoUrl,
      })),
    };
  }
}
