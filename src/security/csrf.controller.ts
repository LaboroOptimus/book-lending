import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { CsrfService } from './csrf.service';

@Controller()
export class CsrfController {
  constructor(private readonly csrf: CsrfService) {}
  @Get('csrf-token')
  token(@Req() request: Request, @Res() response: Response): void {
    response.json({ csrfToken: this.csrf.generateToken(request, response) });
  }

  @Get('csrf.js')
  client(@Res() response: Response): void {
    response.type('application/javascript').send(`
      (() => {
        let token;
        const getToken = async () => token || (token = await fetch('/csrf-token', { credentials: 'same-origin' }).then(r => r.json()).then(r => r.csrfToken));
        const originalFetch = window.fetch;
        window.fetch = async (input, init = {}) => {
          const method = (init.method || 'GET').toUpperCase();
          if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            const headers = new Headers(init.headers || {}); headers.set('x-csrf-token', await getToken()); init.headers = headers;
          }
          return originalFetch(input, init);
        };
        document.addEventListener('submit', async (event) => {
          const form = event.target;
          // AdminJS record/filter forms are handled by React and fetch interception above.
          // Only the server-rendered login form needs a hidden token and native submission.
          if (!(form instanceof HTMLFormElement) || !form.action.endsWith('/admin/login') || form.dataset.csrfBound) return;
          event.preventDefault(); form.dataset.csrfBound = 'true';
          const field = document.createElement('input'); field.type = 'hidden'; field.name = '_csrf'; field.value = await getToken(); form.appendChild(field); form.submit();
        }, true);
      })();`);
  }
}
