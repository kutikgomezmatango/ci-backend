import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hola Mundo! Bienvenido a tu API NestJS. 2023';
  }
}
