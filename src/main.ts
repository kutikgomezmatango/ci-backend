import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const cfg = app.get(ConfigService);

  const nodeEnv = cfg.get<string>('NODE_ENV', 'development');
  const isProd = nodeEnv === 'production';
  const port = parseInt(cfg.get('PORT', '3000'), 10);

  // Prefijo + versionado: /api/v1
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Seguridad HTTP
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // ----- CORS (con cookies) -----
  // ¡Importante! Con cookies, "origin" debe ser una lista exacta (no "*")
  const origins = (cfg.get('ALLOWED_ORIGINS', '') as string)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length ? origins : isProd ? [] : true,
    credentials: true, // permite cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  });

  // Detrás de proxy (Heroku/Render/Nginx)
  const http = app.getHttpAdapter().getInstance();
  if (http?.set) http.set('trust proxy', 1);

  // Rate limit (desde .env)
  const rlMax = parseInt(cfg.get('RATE_LIMIT_MAX', '300'), 10);
  const rlWindow = parseInt(cfg.get('RATE_LIMIT_WINDOW_MS', '900000'), 10);
  app.use(
    rateLimit({
      windowMs: rlWindow,
      max: rlMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Compresión + cookies
  app.use(compression());
  app.use(cookieParser());

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger (desactivable por .env)
  const enableSwagger =
    (cfg.get('SWAGGER_ENABLED', isProd ? 'false' : 'true') as string) ===
    'true';
  if (enableSwagger) {
    const docConfig = new DocumentBuilder()
      .setTitle('Reserva de Aulas - API')
      .setDescription('Endpoints para gestión de aulas y reservas')
      .setVersion('1.0.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Docs - Reserva de Aulas',
    });
  }

  await app.listen(port);
  console.log(`[BOOT] Env=${nodeEnv}  Port=${port}`);
  console.log(
    `[BOOT] CORS origins: ${origins.length ? origins.join(', ') : isProd ? '(ninguno)' : 'ANY'}`,
  );
  console.log(`→ API:   http://localhost:${port}/api/v1`);
  if (enableSwagger) console.log(`→ Docs:  http://localhost:${port}/docs`);
}
bootstrap();
