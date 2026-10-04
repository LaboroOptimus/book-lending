import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import connectPgSimple from 'connect-pg-simple';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { AppModule } from './app.module';
import { CsrfService } from './security/csrf.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const isProduction = config.getOrThrow('NODE_ENV') === 'production';
  if (isProduction) app.getHttpAdapter().getInstance().set('trust proxy', 1);

  const PgSession = connectPgSimple(session);
  app.use(cookieParser());
  app.use(session({
    store: new PgSession({ conString: config.getOrThrow('DATABASE_URL'), tableName: 'user_session', createTableIfMissing: true }),
    name: isProduction ? '__Host-book-lending.sid' : 'book-lending.sid',
    secret: config.getOrThrow('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', secure: isProduction, maxAge: 8 * 60 * 60 * 1000 },
  }));
  app.use(app.get(CsrfService).protection);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
void bootstrap();
