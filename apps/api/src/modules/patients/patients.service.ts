import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@lepera/db';
import type { AuthUser } from '../../common/guards/jwt-auth.guard';
import { ageInYears, parseBirthDate } from '../../common/utils/dates';
import { PrismaService } from '../../prisma/prisma.service';
import { isUniqueViolation } from '../../prisma/prisma-errors';
import { UsersService } from '../users/users.service';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { CreatePatientDto, UpdatePatientDto } from './dto/patient-data.dto';

const DUPLICATE_MESSAGE = 'Já existe um cadastro com este e-mail ou CPF';

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
  ) {}

  /** Cadastro de paciente: usado pela recepção/admin e pelo cadastro público
   *  (POST /auth/register). Cria usuário, perfil e telefone numa transação. */
  async create(dto: CreatePatientDto) {
    const birthDate = parseBirthDate(dto.birthDate);

    if (
      ageInYears(birthDate) < 18 &&
      (!dto.emergencyContactName || !dto.emergencyContactPhone)
    ) {
      throw new BadRequestException(
        'Pacientes menores de 18 anos precisam informar o responsável legal (nome e telefone)',
      );
    }

    if (dto.responsibleDoctorId) {
      const doctor = await this.prisma.db.doctor.findUnique({
        where: { id: dto.responsibleDoctorId },
        select: { id: true },
      });
      if (!doctor) {
        throw new NotFoundException('Profissional não encontrado');
      }
    }

    try {
      return await this.prisma.db.$transaction(async (tx) => {
        const user = await this.users.create(
          {
            name: dto.name,
            cpf: dto.cpf,
            email: dto.email,
            password: dto.password,
            role: 'PATIENT',
          },
          tx,
          { cpf: dto.cpf, birthDate },
        );

        const patient = await tx.patient.create({
          data: {
            userId: user.id,
            insuranceProvider: dto.insuranceProvider,
            insuranceNumber: dto.insuranceNumber,
            emergencyContactName: dto.emergencyContactName,
            emergencyContactPhone: dto.emergencyContactPhone,
            responsibleDoctorId: dto.responsibleDoctorId,
            phones: { create: { type: 'mobile', phone: dto.phone } },
          },
          include: { phones: true },
        });

        return { ...user, patient };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(DUPLICATE_MESSAGE);
      }
      throw error;
    }
  }

  /** Lista paginada com busca por nome, e-mail ou CPF. Sem dados clínicos. */
  async findAll(query: ListPatientsQueryDto) {
    const search = query.search?.trim();
    const digits = search?.replace(/\D/g, '');

    const or: Prisma.UserWhereInput[] = search
      ? [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      : [];
    if (digits) or.push({ cpf: { contains: digits } });

    const where: Prisma.PatientWhereInput = search ? { user: { OR: or } } : {};

    const [total, items] = await Promise.all([
      this.prisma.db.patient.count({ where }),
      this.prisma.db.patient.findMany({
        where,
        select: {
          id: true,
          status: true,
          user: {
            select: {
              name: true,
              email: true,
              cpf: true,
              birthDate: true,
              isActive: true,
            },
          },
          phones: {
            select: { phone: true, type: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          responsibleDoctor: {
            select: { user: { select: { name: true } } },
          },
        },
        orderBy: { user: { name: 'asc' } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  /**
   * Pacientes que o PROFISSIONAL atende (tem ao menos uma consulta com ele).
   * Minimização de dados: sem CPF; só contato básico e a consulta mais recente.
   */
  async findForDoctor(user: AuthUser, query: ListPatientsQueryDto) {
    const doctor = await this.prisma.db.doctor.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    const search = query.search?.trim();
    const where: Prisma.PatientWhereInput = {
      appointments: { some: { doctorId: doctor.id } },
      ...(search
        ? {
            user: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.db.patient.count({ where }),
      this.prisma.db.patient.findMany({
        where,
        select: {
          id: true,
          user: { select: { name: true, email: true, birthDate: true } },
          phones: {
            select: { phone: true },
            orderBy: { createdAt: 'asc' },
            take: 1,
          },
          appointments: {
            where: { doctorId: doctor.id },
            orderBy: { startDatetime: 'desc' },
            take: 1,
            select: { startDatetime: true, status: true },
          },
          _count: {
            select: { appointments: { where: { doctorId: doctor.id } } },
          },
        },
        orderBy: { user: { name: 'asc' } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);

    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  /** Ficha cadastral + últimas consultas. Nada de conteúdo de prontuário. */
  async findOne(id: string) {
    const patient = await this.prisma.db.patient.findUnique({
      where: { id },
      include: {
        user: { omit: { passwordHash: true } },
        phones: { orderBy: { createdAt: 'asc' } },
        addresses: { orderBy: { createdAt: 'asc' } },
        responsibleDoctor: { select: { user: { select: { name: true } } } },
        appointments: {
          orderBy: { startDatetime: 'desc' },
          take: 10,
          select: {
            id: true,
            startDatetime: true,
            status: true,
            type: true,
            doctor: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }
    return patient;
  }

  /** Recepção/admin edita qualquer paciente (inclusive corrige o CPF). */
  async update(id: string, dto: UpdatePatientDto) {
    const patient = await this.prisma.db.patient.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!patient) {
      throw new NotFoundException('Paciente não encontrado');
    }
    return this.applyUpdate(patient, dto, { allowCpfChange: true });
  }

  /** O próprio paciente edita o perfil (CPF só pode ser definido uma vez). */
  async updateMine(user: AuthUser, dto: UpdatePatientDto) {
    const patient = await this.prisma.db.patient.findUnique({
      where: { userId: user.sub },
      select: { id: true, userId: true },
    });
    if (!patient) {
      throw new NotFoundException('Perfil de paciente não encontrado');
    }
    return this.applyUpdate(patient, dto, { allowCpfChange: false });
  }

  private async applyUpdate(
    patient: { id: string; userId: string },
    dto: UpdatePatientDto,
    opts: { allowCpfChange: boolean },
  ) {
    try {
      await this.prisma.db.$transaction(async (tx) => {
        await this.users.updatePersonalData(patient.userId, dto, opts, tx);

        await tx.patient.update({
          where: { id: patient.id },
          data: {
            insuranceProvider: dto.insuranceProvider,
            insuranceNumber: dto.insuranceNumber,
            emergencyContactName: dto.emergencyContactName,
            emergencyContactPhone: dto.emergencyContactPhone,
          },
        });

        if (dto.phone) {
          const phone = await tx.patientPhone.findFirst({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          if (phone) {
            await tx.patientPhone.update({
              where: { id: phone.id },
              data: { phone: dto.phone },
            });
          } else {
            await tx.patientPhone.create({
              data: { patientId: patient.id, type: 'mobile', phone: dto.phone },
            });
          }
        }

        if (dto.address) {
          const address = await tx.patientAddress.findFirst({
            where: { patientId: patient.id },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          if (address) {
            await tx.patientAddress.update({
              where: { id: address.id },
              data: dto.address,
            });
          } else {
            await tx.patientAddress.create({
              data: { patientId: patient.id, ...dto.address },
            });
          }
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Já existe um cadastro com este CPF');
      }
      throw error;
    }

    return this.findOne(patient.id);
  }
}
