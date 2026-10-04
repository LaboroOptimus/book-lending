import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { createAdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { LoansModule } from './loans/loans.module';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './security/security.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
        NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
        PORT: Joi.number().port().default(3000),
        SESSION_SECRET: Joi.string().min(32).required(),
        CSRF_SECRET: Joi.string().min(32).required(),
        CLOUDINARY_CLOUD_NAME: Joi.string().required(),
        CLOUDINARY_API_KEY: Joi.string().required(),
        CLOUDINARY_API_SECRET: Joi.string().required(),
      }),
    }),
    PrismaModule,
    LoansModule,
    SecurityModule,
    createAdminModule(),
    UploadsModule,
  ],
})
export class AppModule {}
