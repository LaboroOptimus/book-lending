import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from './auth.service';
import { ROLES_KEY } from './roles.decorator';

declare module 'express-session' {
  interface SessionData { adminUser?: AuthenticatedUser; }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles) return true;
    const request = context.switchToHttp().getRequest<Request>();
    return Boolean(request.session?.adminUser && roles.includes(request.session.adminUser.role));
  }
}
