import { Controller, Get, Redirect } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Redirect('/admin', 302)
  redirectToAdmin(): void {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
