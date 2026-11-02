import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { InventoryController } from './inventory.controller';

describe('Inventory controller permissions', () => {
  const guard = new RolesGuard(new Reflector());
  it('requires administrator at the controller', () => {
    expect(Reflect.getMetadata(ROLES_KEY, InventoryController)).toEqual([
      'ADMIN',
    ]);
  });

  it.each([
    'ADMIN',
    'SUPER_ADMIN',
    'RECEPTIONIST',
    'DOCTOR',
    'PATIENT',
  ] as const)('enforces the role for %s on every route', (role) => {
    for (const handler of [
      'items',
      'summary',
      'create',
      'update',
      'movements',
      'move',
    ] as const) {
      const routeHandler = Object.getOwnPropertyDescriptor(
        InventoryController.prototype,
        handler,
      )?.value as unknown;
      const context = {
        getHandler: () => routeHandler,
        getClass: () => InventoryController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { sub: 'id', role } }),
        }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(context)).toBe(
        role === 'ADMIN' || role === 'SUPER_ADMIN',
      );
    }
  });
});
