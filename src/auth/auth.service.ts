import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export type AuthenticatedUser = Pick<User, 'id' | 'email' | 'role'>;
export type AdminResource = 'Book' | 'Author' | 'Member' | 'Loan' | 'User';

export const rolePermissions: Record<UserRole, readonly AdminResource[]> = {
  ADMIN: ['Book', 'Author', 'Member', 'Loan', 'User'],
  LIBRARIAN: ['Member', 'Loan'],
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCredentials(email: string, password: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
    return { id: user.id, email: user.email, role: user.role };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  canManage(role: UserRole, resource: AdminResource): boolean {
    return rolePermissions[role].includes(resource);
  }
}
