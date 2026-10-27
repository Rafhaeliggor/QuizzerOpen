import {
  ValidationPipe,
  VersioningType,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { metricasHttp } from './common/metricas/metricas-http.js';
import { fabricaErroValidacao } from './common/validacao/mensagens.js';
import type { Env } from './config/env.js';

/** Configuração HTTP compartilhada entre `main.ts` e os testes e2e. */
export function configurarApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);
  const express = app as NestExpressApplication;

  // Atrás do Nginx: confia em N proxies para obter o IP real (rate limit e sessões).
  express.set('trust proxy', config.get('TRUST_PROXY', { infer: true }));
  express.disable('x-powered-by');

  // Primeiro middleware: a latência medida inclui todo o processamento (ADR-0054).
  app.use(metricasHttp.middleware());

  const tls = config.get('TLS_ATIVO', { infer: true });
  app.use(
    helmet({
      // Mesmo valor do Nginx (ADR-0055): o navegador guarda o último cabeçalho que recebeu.
      hsts: tls
        ? {
            maxAge: 31_536_000,
            includeSubDomains: true,
            preload: config.get('HSTS_PRELOAD', { infer: true }),
          }
        : false,
      contentSecurityPolicy: {
        directives: { upgradeInsecureRequests: tls ? [] : null },
      },
    }),
  );
  app.use(cookieParser());
  // Importação de alunos em CSV envia o arquivo no corpo JSON (até ~1 MB).
  express.useBodyParser('json', { limit: '1mb' });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Mensagens padrão do class-validator traduzidas (chegam ao usuário — BUG-053).
      exceptionFactory: fabricaErroValidacao,
    }),
  );
  app.enableShutdownHooks();
}
