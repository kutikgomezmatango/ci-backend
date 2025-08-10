import { Controller, Get, Res } from '@nestjs/common';
import express from 'express';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return { ok: true, ts: new Date().toISOString() };
  }

  @Get('test-cookie')
  testCookie(@Res({ passthrough: true }) res: express.Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('demo_cookie', 'ok', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/', // ajusta si solo quieres que viva en /auth/refresh
      maxAge: 60 * 60 * 1000,
    });
    return { message: 'cookie seteada' };
  }
}
