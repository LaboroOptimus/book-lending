import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CsrfService } from './csrf.service';

@Controller('admin')
export class CsrfController {
  constructor(private readonly csrf: CsrfService) {}
  @Get('csrf-token')
  token(@Req() request: Request, @Res() response: Response): void {
    response.json({ csrfToken: this.csrf.generateToken(request, response) });
  }
}
