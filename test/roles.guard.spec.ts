import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../src/auth/guards/roles.guard';

const makeContext = (roles: string[], user: any, params: any) => {
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles as any);
  const guard = new RolesGuard(reflector);
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
  return { guard, ctx };
};

describe('RolesGuard', () => {
  it('allows admin for any route', () => {
    const { guard, ctx } = makeContext(['admin'], { role: 'admin' }, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows player only for own resource', () => {
    const { guard, ctx } = makeContext(['player'], { role: 'player', userId: '123' }, { id: '123' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies player for others', () => {
    const { guard, ctx } = makeContext(['player'], { role: 'player', userId: '123' }, { id: '999' });
    expect(() => guard.canActivate(ctx)).toThrow();
  });

  it('allows mixed admin/player when admin', () => {
    const { guard, ctx } = makeContext(['admin', 'player'], { role: 'admin' }, { id: '999' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});