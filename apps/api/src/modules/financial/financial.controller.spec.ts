import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import type { Role } from '@lepera/contracts';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { FinancialController } from './financial.controller';

describe('financial endpoint access', () => {
  const guard = new RolesGuard(new Reflector());
  function context(
    role: Role,
    method: keyof FinancialController,
  ): ExecutionContext {
    return {
      // Nest lê os metadados desta função; ela não será executada pelo teste.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      getHandler: () => FinancialController.prototype[method],
      getClass: () => FinancialController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { sub: 'u', role } }),
      }),
    } as unknown as ExecutionContext;
  }

  it('uses authentication as well as role guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, FinancialController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it.each([
    'findAll',
    'summary',
    'export',
    'appointments',
    'create',
    'update',
    'settle',
    'cancel',
    'reopen',
  ] as const)('blocks patients and professionals from %s', (method) => {
    expect(guard.canActivate(context('PATIENT', method))).toBe(false);
    expect(guard.canActivate(context('DOCTOR', method))).toBe(false);
    expect(guard.canActivate(context('ADMIN', method))).toBe(true);
    expect(guard.canActivate(context('SUPER_ADMIN', method))).toBe(true);
  });

  it('allows reception workflows but reserves reopening to administrators', () => {
    expect(guard.canActivate(context('RECEPTIONIST', 'findAll'))).toBe(true);
    expect(guard.canActivate(context('RECEPTIONIST', 'settle'))).toBe(true);
    expect(guard.canActivate(context('RECEPTIONIST', 'reopen'))).toBe(false);
  });
});
