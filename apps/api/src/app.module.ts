import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthGuard } from './common/auth/auth.guard.js';
import { configurarThrottlers } from './common/throttle/throttlers.js';
import { validarEnv, type Env } from './config/env.js';
import { EmailModule } from './infra/email/email.module.js';
import { PrismaModule } from './infra/prisma/prisma.module.js';
import { RedisModule } from './infra/redis/redis.module.js';
import { AplicacaoModule } from './modules/aplicacao/aplicacao.module.js';
import { AuditoriaModule } from './modules/auditoria/auditoria.module.js';
import { CorrecaoModule } from './modules/correcao/correcao.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { IamModule } from './modules/iam/iam.module.js';
import { IntegracaoModule } from './modules/integracao/integracao.module.js';
import { LgpdModule } from './modules/lgpd/lgpd.module.js';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module.js';
import { ProvasModule } from './modules/provas/provas.module.js';
import { QuestoesModule } from './modules/questoes/questoes.module.js';
import { RecursosModule } from './modules/recursos/recursos.module.js';
import { RelatoriosModule } from './modules/relatorios/relatorios.module.js';
import { TurmasModule } from './modules/turmas/turmas.module.js';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validarEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: config.get('LOG_LEVEL', { infer: true }),
          // JSON puro em stdout fora do desenvolvimento (coletado pelo Docker).
          transport:
            config.get('NODE_ENV', { infer: true }) === 'development'
              ? { target: 'pino-pretty', options: { singleLine: true } }
              : undefined,
          // Log enxuto: sem cabeçalhos completos (podem conter dados sensíveis).
          serializers: {
            req: (req: { id: unknown; method: string; url: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
            res: (res: { statusCode: number }) => ({
              statusCode: res.statusCode,
            }),
          },
          autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
        },
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        signOptions: { algorithm: 'HS256', issuer: 'quizzer' },
        verifyOptions: { algorithms: ['HS256'], issuer: 'quizzer' },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        throttlers: configurarThrottlers(
          config.get('RATE_LIMIT_POR_IP', { infer: true }),
          config.get('RATE_LIMIT_CREDENCIAIS', { infer: true }),
        ),
      }),
    }),
    PrismaModule,
    RedisModule,
    EmailModule,
    AuditoriaModule,
    NotificacoesModule,
    HealthModule,
    IamModule,
    UsuariosModule,
    QuestoesModule,
    TurmasModule,
    ProvasModule,
    CorrecaoModule,
    RecursosModule,
    AplicacaoModule,
    RelatoriosModule,
    LgpdModule,
    IntegracaoModule,
  ],
  providers: [
    // Ordem importa: primeiro rate limit, depois autenticação/autorização.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
