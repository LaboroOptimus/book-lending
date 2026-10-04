import { Module } from '@nestjs/common';
import { LoansService } from './loans.service';

@Module({ providers: [LoansService], exports: [LoansService] })
export class LoansModule {}
