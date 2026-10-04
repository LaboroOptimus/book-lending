import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryService } from './cloudinary.service';
import { CoversController } from './covers.controller';

@Module({ imports: [AuthModule], controllers: [CoversController], providers: [CloudinaryService] })
export class UploadsModule {}
