import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WaitlistService } from './waitlist.service';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let patientFindUnique: jest.Mock;
  let doctorFindUnique: jest.Mock;
  let waitlistFindFirst: jest.Mock;
  let waitlistCreate: jest.Mock;
  let waitlistUpdate: jest.Mock;
  let waitlistUpdateMany: jest.Mock;
  let waitlistFindUnique: jest.Mock;

  beforeEach(() => {
    patientFindUnique = jest.fn().mockResolvedValue({ id: 'patient-1' });
    doctorFindUnique = jest.fn().mockResolvedValue({ id: 'doctor-1' });
    waitlistFindFirst = jest.fn().mockResolvedValue(null);
    waitlistCreate = jest.fn().mockResolvedValue({ id: 'w1' });
    waitlistUpdate = jest.fn().mockResolvedValue({ id: 'w1' });
    waitlistUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    waitlistFindUnique = jest.fn().mockResolvedValue({ id: 'w1' });

    service = new WaitlistService({
      db: {
        patient: { findUnique: patientFindUnique },
        doctor: { findUnique: doctorFindUnique },
        waitlist: {
          findFirst: waitlistFindFirst,
          create: waitlistCreate,
          update: waitlistUpdate,
          updateMany: waitlistUpdateMany,
          findUnique: waitlistFindUnique,
        },
      },
    } as unknown as PrismaService);
  });

  describe('create', () => {
    it('paciente entra por si mesmo e sempre com prioridade média', async () => {
      await service.create(
        { patientId: 'outro', priority: 'HIGH', preferredShift: 'MORNING' },
        { sub: 'patient-user', role: 'PATIENT' },
      );

      expect(patientFindUnique).toHaveBeenCalledWith({
        where: { userId: 'patient-user' },
        select: { id: true },
      });
      expect(waitlistCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-1',
            priority: 'MEDIUM',
            preferredShift: 'MORNING',
          }) as unknown,
        }),
      );
    });

    it('recepção escolhe o paciente e a prioridade', async () => {
      await service.create(
        { patientId: 'patient-9', priority: 'HIGH' },
        { sub: 'rec', role: 'RECEPTIONIST' },
      );

      expect(patientFindUnique).toHaveBeenCalledWith({
        where: { id: 'patient-9' },
        select: { id: true },
      });
      expect(waitlistCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 'HIGH' }) as unknown,
        }),
      );
    });

    it('recepção precisa informar o paciente', async () => {
      await expect(
        service.create({}, { sub: 'rec', role: 'RECEPTIONIST' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('recusa pedido duplicado ativo para o mesmo profissional', async () => {
      waitlistFindFirst.mockResolvedValue({ id: 'w0' });

      await expect(
        service.create(
          { preferredDoctorId: 'doctor-1' },
          { sub: 'patient-user', role: 'PATIENT' },
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(waitlistCreate).not.toHaveBeenCalled();
    });

    it('404 para profissional ou paciente inexistente', async () => {
      doctorFindUnique.mockResolvedValue(null);
      await expect(
        service.create(
          { preferredDoctorId: 'nope' },
          { sub: 'patient-user', role: 'PATIENT' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);

      patientFindUnique.mockResolvedValue(null);
      await expect(
        service.create(
          { patientId: 'x' },
          { sub: 'rec', role: 'RECEPTIONIST' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('marcar como agendado ou desistência registra a saída', async () => {
      await service.update('w1', { status: 'scheduled' });

      expect(waitlistUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'scheduled',
            exitedAt: expect.any(Date) as unknown,
          }) as unknown,
        }),
      );
    });

    it('voltar para "waiting" limpa a saída; só prioridade não mexe nela', async () => {
      await service.update('w1', { status: 'waiting' });
      expect(waitlistUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ exitedAt: null }) as unknown,
        }),
      );

      await service.update('w1', { priority: 'LOW' });
      expect(waitlistUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            exitedAt: undefined,
            priority: 'LOW',
          }) as unknown,
        }),
      );
    });

    it('404 para pedido inexistente', async () => {
      waitlistFindUnique.mockResolvedValue(null);

      await expect(service.update('nope', {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('leave', () => {
    it('o paciente desiste do próprio pedido', async () => {
      await expect(
        service.leave('w1', { sub: 'patient-user', role: 'PATIENT' }),
      ).resolves.toEqual({ ok: true });

      expect(waitlistUpdateMany).toHaveBeenCalledWith({
        where: {
          id: 'w1',
          patient: { userId: 'patient-user' },
          status: { in: ['waiting', 'notified'] },
        },
        data: { status: 'gave_up', exitedAt: expect.any(Date) as unknown },
      });
    });

    it('pedido de outra pessoa (ou já encerrado) responde 404', async () => {
      waitlistUpdateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.leave('w1', { sub: 'patient-user', role: 'PATIENT' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
