import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';

@Global()
@Module({ providers: [AuthService, RolesGuard], exports: [AuthService, RolesGuard] })
export class AuthModule {}
