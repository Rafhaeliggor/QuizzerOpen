import { Controller, Get, Inject, Query } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { Publico } from '../../common/auth/decorators.js';
import {
  metricasHttp,
  type ResumoMetricas,
} from '../../common/metricas/metricas-http.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { REDIS } from '../../infra/redis/redis.module.js';

@Controller('health')
@Publico()
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicador: HealthIndicatorService,
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  /** Usado pelo healthcheck do Docker, pelo Nginx e pelo monitor de uptime. */
  @Get()
  @HealthCheck()
  verificar() {
    return this.health.check([
      async () => {
        const db = this.indicador.check('database');
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return db.up();
        } catch {
          return db.down('sem conexão com o PostgreSQL');
        }
      },
      async () => {
        const redis = this.indicador.check('redis');
        try {
          if (this.redis.status === 'wait') await this.redis.connect();
          await this.redis.ping();
          return redis.up();
        } catch {
          return redis.down('sem conexão com o Redis');
        }
      },
    ]);
  }

  /**
   * Resumo de requisições, 5xx e latência dos últimos `janela` minutos, lido pelo monitor
   * (ADR-0054). Só contagens, sem dado pessoal; mesmo assim o Nginx não expõe esta rota.
   */
  @Get('metricas')
  metricas(@Query('janela') janela?: string): ResumoMetricas {
    return metricasHttp.resumo(Number(janela ?? 5));
  }
}
