import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || !user.role) throw new ForbiddenException('No role');

    // Admin access
    if (user.role === 'admin') return true;

    // Player access restricted to own resource
    if (requiredRoles.includes('player')) {
      const targetId = req.params?.id;
      if (targetId && user.userId === targetId) return true;
      throw new ForbiddenException('Players can only access their own data');
    }

    throw new ForbiddenException('Access denied');
  }
}