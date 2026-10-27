import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { MINUTOS_GUARDADOS, MetricasHttp } from './metricas-http.js';

const T0 = Date.UTC(2026, 9, 19, 12, 0, 0);
const MIN = 60_000;

describe('MetricasHttp', () => {
  it('sem requisições: taxa zero e percentis nulos', () => {
    const r = new MetricasHttp().resumo(5, T0);
    expect(r).toMatchObject({ requisicoes: 0, erros5xx: 0, taxa5xxPct: 0 });
    expect(r.latenciaP95Ms).toBeNull();
  });

  it('calcula a taxa de 5xx e os percentis pela faixa do histograma', () => {
    const m = new MetricasHttp();
    for (let i = 0; i < 90; i++) m.registrar(200, 30, T0);
    for (let i = 0; i < 6; i++) m.registrar(500, 800, T0);
    for (let i = 0; i < 4; i++) m.registrar(404, 3000, T0);
    const r = m.resumo(5, T0);
    expect(r.requisicoes).toBe(100);
    expect(r.erros5xx).toBe(6);
    expect(r.taxa5xxPct).toBe(6);
    expect(r.latenciaP50Ms).toBe(50);
    expect(r.latenciaP95Ms).toBe(1000);
  });

  it('considera só os minutos da janela pedida', () => {
    const m = new MetricasHttp();
    m.registrar(500, 10, T0);
    m.registrar(200, 10, T0 + 10 * MIN);
    expect(m.resumo(5, T0 + 10 * MIN)).toMatchObject({ requisicoes: 1, erros5xx: 0 });
    expect(m.resumo(15, T0 + 10 * MIN)).toMatchObject({ requisicoes: 2, erros5xx: 1 });
    expect(m.resumo(15, T0 + 10 * MIN).desdeInicio.requisicoes).toBe(2);
  });

  it('limita a janela e descarta minutos antigos', () => {
    const m = new MetricasHttp();
    m.registrar(200, 10, T0);
    m.registrar(200, 10, T0 + (MINUTOS_GUARDADOS + 5) * MIN);
    const r = m.resumo(999, T0 + (MINUTOS_GUARDADOS + 5) * MIN);
    expect(r.janelaMin).toBe(MINUTOS_GUARDADOS);
    expect(r.requisicoes).toBe(1);
  });

  it('latência acima da maior faixa informa o dobro dela', () => {
    const m = new MetricasHttp();
    m.registrar(200, 60_000, T0);
    expect(m.resumo(1, T0).latenciaP95Ms).toBe(20_000);
  });

  it('middleware ignora health check e fluxo SSE e mede as demais rotas', () => {
    const m = new MetricasHttp();
    const mw = m.middleware();
    const chamar = (url: string, status: number) => {
      const res = Object.assign(new EventEmitter(), { statusCode: status });
      const next = vi.fn() as unknown as NextFunction;
      mw({ originalUrl: url } as Request, res as unknown as Response, next);
      res.emit('finish');
      expect(next).toHaveBeenCalled();
    };
    chamar('/api/v1/health', 200);
    chamar('/api/v1/health/metricas?janela=5', 200);
    chamar('/api/v1/notificacoes/fluxo?token=x', 200);
    chamar('/api/v1/provas', 200);
    chamar('/api/v1/provas/1', 503);
    const r = m.resumo(1);
    expect(r.requisicoes).toBe(2);
    expect(r.erros5xx).toBe(1);
  });

  it('rotas de credencial contam para 5xx, mas não para a latência', () => {
    const m = new MetricasHttp();
    const mw = m.middleware();
    const chamar = (url: string, status: number) => {
      const res = Object.assign(new EventEmitter(), { statusCode: status });
      mw({ originalUrl: url } as Request, res as unknown as Response, vi.fn() as unknown as NextFunction);
      res.emit('finish');
    };
    chamar('/api/v1/auth/senha', 500);
    expect(m.resumo(1)).toMatchObject({ requisicoes: 1, erros5xx: 1, latenciaP95Ms: null });
    chamar('/api/v1/provas', 200);
    expect(m.resumo(1).latenciaP95Ms).toBe(50);
  });
});
