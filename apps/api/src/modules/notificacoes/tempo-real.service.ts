import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { Subject } from 'rxjs';
import { REDIS } from '../../infra/redis/redis.module.js';

const CANAL = 'quizzer:notificacoes';

export interface SinalNotificacao {
  usuarioId: string;
  titulo: string;
}

/**
 * Sinal de "notificação nova" em tempo real (lote 8 — ADR-0050). Publica no Redis para funcionar
 * com várias instâncias da API; se o Redis falhar, entrega só na instância local.
 * O sinal não carrega o conteúdo: o navegador recarrega a lista pela rota normal (com autorização).
 */
@Injectable()
export class TempoRealService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TempoRealService.name);
  readonly sinais = new Subject<SinalNotificacao>();
  private assinante?: Redis;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleInit() {
    try {
      this.assinante = this.redis.duplicate();
      this.assinante.on('message', (_canal: string, msg: string) => {
        try {
          for (const s of JSON.parse(msg) as SinalNotificacao[]) this.sinais.next(s);
        } catch {
          /* mensagem malformada: ignora */
        }
      });
      this.assinante.on('error', (erro) => this.logger.warn({ erro: String(erro) }, 'Redis (tempo real) indisponível'));
      await this.assinante.subscribe(CANAL);
    } catch (erro) {
      this.logger.warn({ erro: String(erro) }, 'Tempo real sem Redis: só sinais locais');
      this.assinante = undefined;
    }
  }

  async onModuleDestroy() {
    await this.assinante?.quit().catch(() => undefined);
  }

  async publicar(sinais: SinalNotificacao[]) {
    if (sinais.length === 0) return;
    try {
      if (!this.assinante) throw new Error('sem assinante');
      if (this.redis.status === 'wait') await this.redis.connect();
      await this.redis.publish(CANAL, JSON.stringify(sinais));
    } catch {
      for (const s of sinais) this.sinais.next(s);
    }
  }
}
