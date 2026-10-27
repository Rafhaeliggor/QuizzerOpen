import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';
import type { Env } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  configurarApp(app);
  await app.listen(
    app.get(ConfigService<Env, true>).get('PORT', { infer: true }),
    '0.0.0.0',
  );
}
await bootstrap();
