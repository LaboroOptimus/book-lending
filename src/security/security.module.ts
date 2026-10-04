import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CsrfController } from './csrf.controller';
import { CsrfService } from './csrf.service';

@Module({ imports: [AuthModule], controllers: [CsrfController], providers: [CsrfService], exports: [CsrfService] })
export class SecurityModule {}
