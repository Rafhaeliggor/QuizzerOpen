import type { NextFunction, Request, Response } from 'express';

/**
 * Métricas HTTP em memória (ADR-0054): contagem de requisições, erros 5xx e latência por minuto,
 * guardadas em janela deslizante. O monitor lê o resumo em `/api/v1/health/metricas` (rota
 * bloqueada no Nginx) e avisa por webhook quando a taxa de 5xx ou o p95 passam do limite.
 */

/** Limites superiores (ms) das faixas do histograma de latência; a última é "acima disso". */
export const FAIXAS_MS = [50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;
/** Minutos guardados — o resumo aceita janelas de 1 até este valor. */
export const MINUTOS_GUARDADOS = 60;

/** Rotas fora da conta: health checks (frequentes e triviais) e o fluxo SSE (conexão longa). */
const IGNORADAS = ['/api/v1/health', '/api/v1/notificacoes/fluxo'];
/**
 * Rotas de credencial contam para a taxa de 5xx, mas não para a latência: o Argon2 é lento de
 * propósito, e a turma inteira trocando a senha no 1º acesso daria p95 > 2 s sem nada errado.
 */
const SEM_LATENCIA = ['/api/v1/auth/'];

interface Minuto {
  minuto: number;
  requisicoes: number;
  erros5xx: number;
  faixas: number[];
}

export interface ResumoMetricas {
  janelaMin: number;
  requisicoes: number;
  erros5xx: number;
  /** Percentual de respostas 5xx na janela (0–100, duas casas). Inclui as rotas de credencial. */
  taxa5xxPct: number;
  /** Limite superior da faixa que contém o percentil (sem as rotas de credencial); null sem amostras. */
  latenciaP50Ms: number | null;
  latenciaP95Ms: number | null;
  desdeInicio: { requisicoes: number; erros5xx: number; inicio: string };
}

export class MetricasHttp {
  private readonly minutos: Minuto[] = [];
  private total = 0;
  private total5xx = 0;
  private readonly inicio = new Date();

  registrar(status: number, duracaoMs: number | null, agora = Date.now()): void {
    const minuto = Math.floor(agora / 60_000);
    let atual = this.minutos.at(-1);
    if (!atual || atual.minuto !== minuto) {
      atual = {
        minuto,
        requisicoes: 0,
        erros5xx: 0,
        faixas: Array<number>(FAIXAS_MS.length + 1).fill(0),
      };
      this.minutos.push(atual);
      while (this.minutos[0].minuto <= minuto - MINUTOS_GUARDADOS) {
        this.minutos.shift();
      }
    }
    if (duracaoMs !== null) {
      const faixa = FAIXAS_MS.findIndex((limite) => duracaoMs <= limite);
      atual.faixas[faixa === -1 ? FAIXAS_MS.length : faixa]++;
    }
    atual.requisicoes++;
    this.total++;
    if (status >= 500) {
      atual.erros5xx++;
      this.total5xx++;
    }
  }

  resumo(janelaMin: number, agora = Date.now()): ResumoMetricas {
    const janela = Math.min(Math.max(Math.trunc(janelaMin) || 1, 1), MINUTOS_GUARDADOS);
    const desde = Math.floor(agora / 60_000) - janela + 1;
    const faixas = Array<number>(FAIXAS_MS.length + 1).fill(0);
    let requisicoes = 0;
    let erros5xx = 0;
    for (const m of this.minutos) {
      if (m.minuto < desde) continue;
      requisicoes += m.requisicoes;
      erros5xx += m.erros5xx;
      m.faixas.forEach((n, i) => (faixas[i] += n));
    }
    const amostras = faixas.reduce((a, n) => a + n, 0);
    const percentil = (p: number): number | null => {
      if (amostras === 0) return null;
      const alvo = Math.ceil(amostras * p);
      let acumulado = 0;
      for (let i = 0; i < faixas.length; i++) {
        acumulado += faixas[i];
        // Acima da última faixa não há limite superior: informa o dobro dela.
        if (acumulado >= alvo) return FAIXAS_MS[i] ?? FAIXAS_MS.at(-1)! * 2;
      }
      return null;
    };
    return {
      janelaMin: janela,
      requisicoes,
      erros5xx,
      taxa5xxPct: requisicoes ? Math.round((erros5xx / requisicoes) * 10_000) / 100 : 0,
      latenciaP50Ms: percentil(0.5),
      latenciaP95Ms: percentil(0.95),
      desdeInicio: {
        requisicoes: this.total,
        erros5xx: this.total5xx,
        inicio: this.inicio.toISOString(),
      },
    };
  }

  /** Middleware Express: mede do recebimento até o fim da resposta. */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const caminho = req.originalUrl.split('?')[0];
      if (IGNORADAS.some((p) => caminho === p || caminho.startsWith(`${p}/`))) {
        next();
        return;
      }
      const inicio = process.hrtime.bigint();
      const medirLatencia = !SEM_LATENCIA.some((p) => caminho.startsWith(p));
      res.on('finish', () => {
        this.registrar(
          res.statusCode,
          medirLatencia ? Number(process.hrtime.bigint() - inicio) / 1e6 : null,
        );
      });
      next();
    };
  }
}

/** Instância única do processo (compartilhada pelo middleware e pelo HealthController). */
export const metricasHttp = new MetricasHttp();
