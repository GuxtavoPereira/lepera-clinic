import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentCalendarService } from '../appointments/appointment-calendar.service';
import {
  GoogleIdentityVerifier,
  GooglePreviewService,
} from './google-preview.service';

describe('Google preview isolation', () => {
  const origin = 'https://clinic.example.test';
  const clientId = '123-abc.apps.googleusercontent.com';
  let jwt: JwtService;
  let config: ConfigService;
  let verify: jest.Mock;
  let findMany: jest.Mock;
  let slots: jest.Mock;
  let service: GooglePreviewService;
  beforeEach(() => {
    jwt = new JwtService({ secret: 'test-secret-with-at-least-32-characters' });
    config = new ConfigService({ WEB_URL: origin, GOOGLE_CLIENT_ID: clientId });
    verify = jest.fn();
    findMany = jest.fn().mockResolvedValue([]);
    slots = jest.fn().mockResolvedValue({ items: [] });
    service = new GooglePreviewService(
      config,
      jwt,
      { verify } as unknown as GoogleIdentityVerifier,
      { db: { doctor: { findMany } } } as unknown as PrismaService,
      { previewAvailableSlots: slots } as unknown as AppointmentCalendarService,
    );
  });
  async function credential() {
    const challenge = await service.challenge(origin);
    verify.mockResolvedValue({
      sub: 'google-sub',
      email: 'visitor@example.test',
      email_verified: true,
      name: 'Visitor',
      nonce: challenge.nonce,
    });
    return challenge;
  }
  it('verifies client audience/nonce and issues only calendar preview', async () => {
    const c = await credential();
    const result = await service.createSession(
      'google-signed-id-token',
      c.challenge,
      origin,
    );
    expect(verify).toHaveBeenCalledWith('google-signed-id-token', clientId);
    const payload = jwt.decode<Record<string, unknown>>(result.accessToken);
    expect(payload).toMatchObject({
      sub: 'google:google-sub',
      purpose: 'google_preview',
      scope: 'calendar:read',
      aud: 'lepera-google-preview',
    });
    expect(payload.role).toBeUndefined();
    await expect(
      service.verifySession(result.accessToken),
    ).resolves.toMatchObject({ name: 'Visitor' });
    expect(findMany).not.toHaveBeenCalled(); // no patient/user creation or lookup by e-mail
  });
  it.each(['nonce', 'email_verified'])('rejects invalid %s', async (field) => {
    const c = await credential();
    verify.mockResolvedValue({
      sub: 'google-sub',
      email: 'visitor@example.test',
      email_verified: field !== 'email_verified',
      nonce: field === 'nonce' ? 'wrong' : c.nonce,
    });
    await expect(
      service.createSession('id', c.challenge, origin),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects signatures, foreign audience, expired challenge, and wrong origin', async () => {
    const c = await credential();
    await expect(
      service.createSession('id', c.challenge, 'https://evil.test'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.challenge(undefined)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const expired = jwt.sign(
      { purpose: 'google_challenge', nonce: c.nonce },
      {
        expiresIn: -1,
        audience: 'lepera-google-challenge',
        issuer: 'lepera-clinic',
      },
    );
    await expect(
      service.createSession('id', expired, origin),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    verify.mockRejectedValue(new Error('Google signature invalid'));
    await expect(
      service.createSession('id', c.challenge, origin),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.verifySession(c.challenge)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      service.verifySession(jwt.sign({ sub: 'u', role: 'ADMIN' })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('disables preview when no client is configured', async () => {
    config.set('GOOGLE_CLIENT_ID', '');
    expect(service.configuration()).toEqual({ enabled: false, clientId: null });
    await expect(service.challenge(origin)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
  it('projects only public doctor data and delegates only free slots', async () => {
    findMany.mockResolvedValue([
      {
        id: 'd',
        user: { name: 'Doctor' },
        specialty: 'Psicologia Clínica',
        clinicalApproach: null,
      },
    ]);
    await expect(service.doctors()).resolves.toEqual({
      items: [
        {
          id: 'd',
          name: 'Doctor',
          specialty: 'Psicologia Clínica',
          clinicalApproach: null,
        },
      ],
    });
    const calls = findMany.mock.calls as [{ select: { user: unknown } }][];
    expect(calls[0][0].select.user).toEqual({
      select: { name: true },
    });
    const query = { from: '2026-11-01', to: '2026-11-08' };
    await service.slots(query);
    expect(slots).toHaveBeenCalledWith(query);
  });
});
