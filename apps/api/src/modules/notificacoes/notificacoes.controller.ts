import { Controller, Get, Header, HttpCode, Param, ParseUUIDPipe, Post, Sse, type MessageEvent } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { filter, interval, map, merge, Observable, takeUntil, timer } from 'rxjs';
import { UsuarioAtual } from '../../common/auth/decorators.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { NotificacoesService } from './notificacoes.service.js';
import { TempoRealService } from './tempo-real.service.js';

/** O fluxo fecha a cada 60 s: o cliente reconecta e o guard revalida sessão/token (ADR-0050). */
const DURACAO_FLUXO_MS = 60_000;

/** Disponível nos dois ambientes: cada usuário só vê as próprias notificações. */
@Controller('notificacoes')
export class NotificacoesController {
  constructor(
    private readonly notificacoes: NotificacoesService,
    private readonly tempoReal: TempoRealService,
  ) {}

  /** Server-Sent Events: avisa que há notificação nova (o conteúdo vem de GET /notificacoes). */
  @Sse('fluxo')
  @SkipThrottle()
  @Header('X-Accel-Buffering', 'no')
  @Header('Cache-Control', 'no-cache, no-transform')
  fluxo(@UsuarioAtual() u: UsuarioAutenticado): Observable<MessageEvent> {
    const novas = this.tempoReal.sinais.pipe(
      filter((s) => s.usuarioId === u.id),
      map((s) => ({ type: 'notificacao', data: { titulo: s.titulo } })),
    );
    const pulso = interval(20_000).pipe(map(() => ({ type: 'pulso', data: {} })));
    return merge(timer(0).pipe(map(() => ({ type: 'pronto', data: {} }))), novas, pulso).pipe(takeUntil(timer(DURACAO_FLUXO_MS)));
  }

  @Get()
  listar(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.notificacoes.listar(u.id);
  }

  @Post('lidas')
  @HttpCode(204)
  marcarTodas(@UsuarioAtual() u: UsuarioAutenticado) {
    return this.notificacoes.marcarTodas(u.id);
  }

  @Post(':id/lida')
  @HttpCode(204)
  marcarLida(@UsuarioAtual() u: UsuarioAutenticado, @Param('id', ParseUUIDPipe) id: string) {
    return this.notificacoes.marcarLida(u.id, id);
  }
}
