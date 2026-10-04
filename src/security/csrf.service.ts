import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { doubleCsrf } from 'csrf-csrf';
import { Request, Response } from 'express';

@Injectable()
export class CsrfService {
  private readonly csrf;
  constructor(config: ConfigService) {
    const isProduction = config.getOrThrow('NODE_ENV') === 'production';
    this.csrf = doubleCsrf({
      getSecret: () => config.getOrThrow<string>('CSRF_SECRET'),
      getSessionIdentifier: (request) => request.sessionID ?? '',
      cookieName: isProduction ? '__Host-book-lending-csrf' : 'book-lending-csrf',
      cookieOptions: { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' },
      getCsrfTokenFromRequest: (request) => request.headers['x-csrf-token'],
    });
  }
  get protection() { return this.csrf.doubleCsrfProtection; }
  generateToken(request: Request, response: Response): string { return this.csrf.generateCsrfToken(request, response); }
}
