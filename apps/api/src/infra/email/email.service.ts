import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Retentativas: 1, 2, 4, 8, 16 e 32 min (6 tentativas ≈ 1 h). Depois a mensagem fica para diagnóstico por 7 dias. */
const MAX_TENTATIVAS = 6;
/** Tempo em que um item fica reservado para quem está tentando enviá-lo. */
const RESERVA_MS = 5 * 60_000;

export interface MensagemEmail {
  para: string;
  assunto: string;
  texto: string;
}

/**
 * Envio de e-mail (ADR-0041). Opcional: sem SMTP configurado, `enviar` não faz nada e devolve
 * false — os fluxos têm alternativa sem e-mail. Falha de envio nunca quebra a operação de
 * negócio (é registrada no log). Só texto puro: nada de HTML montado com dados do usuário.
 */
@Injectable()
export class EmailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailService.name);
  private worker?: NodeJS.Timeout;
  private readonly transporte: Transporter | null;
  readonly modo: 'smtp' | 'memoria' | 'desligado';
  /** Modo `memoria` (testes): mensagens "enviadas". */
  readonly caixaDeSaida: MensagemEmail[] = [];

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    const host = this.config.get('SMTP_HOST', { infer: true });
    this.modo = this.config.get('EMAIL_TRANSPORTE', { infer: true }) ?? (host ? 'smtp' : 'desligado');
    if (this.modo === 'smtp') {
      const usuario = this.config.get('SMTP_USUARIO', { infer: true });
      this.transporte = nodemailer.createTransport({
        host,
        port: this.config.get('SMTP_PORTA', { infer: true }),
        secure: this.config.get('SMTP_SEGURO', { infer: true }),
        requireTLS: !this.config.get('SMTP_SEGURO', { infer: true }) && this.config.get('NODE_ENV', { infer: true }) === 'production',
        auth: usuario ? { user: usuario, pass: this.config.get('SMTP_SENHA', { infer: true }) } : undefined,
        connectionTimeout: 10_000,
        socketTimeout: 15_000,
      });
    } else {
      this.transporte = null;
    }
  }

  onModuleInit() {
    if (this.modo !== 'smtp') return;
    this.worker = setInterval(() => {
      this.processarFila().catch((erro: unknown) => this.logger.error({ erro: String(erro) }, 'Falha na fila de e-mail'));
    }, 60_000);
    this.worker.unref();
  }

  onModuleDestroy() {
    if (this.worker) clearInterval(this.worker);
  }

  /**
   * E-mail de notificação com retentativa (lote 8 — ADR-0050). Tenta na hora; se falhar, fica na
   * fila. Mensagens com link de acesso (senha/convite) usam `enviar` direto e nunca vão para o banco.
   */
  async enfileirar(m: MensagemEmail): Promise<void> {
    if (this.modo === 'desligado') return;
    // Já nasce reservado: o worker não pega o item enquanto esta primeira tentativa está em curso.
    const item = await this.prisma.emailPendente.create({
      data: { para: m.para, assunto: m.assunto, texto: m.texto, proximaTentativaEm: new Date(Date.now() + RESERVA_MS) },
    });
    await this.tentar(item);
  }

  /** Reenvia o que está vencido na fila e apaga o que já desistiu há mais de 7 dias. */
  async processarFila(agora = new Date()): Promise<{ enviados: number; falhas: number }> {
    // Uma rodada por vez neste processo (um lote lento de SMTP não empilha rodadas — BUG-050).
    if (this.processando) return { enviados: 0, falhas: 0 };
    this.processando = true;
    try {
      await this.prisma.emailPendente.deleteMany({
        where: { tentativas: { gte: MAX_TENTATIVAS }, criadoEm: { lt: new Date(agora.getTime() - 7 * 86_400_000) } },
      });
      // Reserva atômica: outra rodada ou outra réplica não pega os mesmos itens (SKIP LOCKED);
      // se o processo cair no meio, a reserva vence e o item volta para a fila.
      const reservaAte = new Date(agora.getTime() + RESERVA_MS);
      const vencidos = await this.prisma.$queryRaw<{ id: string; para: string; assunto: string; texto: string; tentativas: number }[]>`
        UPDATE notificacoes.emails_pendentes SET proxima_tentativa_em = ${reservaAte}
        WHERE id IN (
          SELECT id FROM notificacoes.emails_pendentes
          WHERE proxima_tentativa_em <= ${agora} AND tentativas < ${MAX_TENTATIVAS}
          ORDER BY proxima_tentativa_em LIMIT 100
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id, para, assunto, texto, tentativas`;
      let enviados = 0;
      for (const item of vencidos) if (await this.tentar(item)) enviados++;
      return { enviados, falhas: vencidos.length - enviados };
    } finally {
      this.processando = false;
    }
  }

  private processando = false;

  private async tentar(item: { id: string; para: string; assunto: string; texto: string; tentativas: number }) {
    const ok = await this.enviar({ para: item.para, assunto: item.assunto, texto: item.texto });
    if (ok) {
      await this.prisma.emailPendente.delete({ where: { id: item.id } }).catch(() => undefined);
      return true;
    }
    const tentativas = item.tentativas + 1;
    await this.prisma.emailPendente.update({
      where: { id: item.id },
      data: {
        tentativas,
        proximaTentativaEm: new Date(Date.now() + 2 ** (tentativas - 1) * 60_000),
        ultimoErro: this.ultimoErro ?? 'falha no envio',
      },
    });
    return false;
  }

  private ultimoErro?: string;
  /** Testes: força falha no modo memória para exercitar a fila. */
  falharProximos = 0;

  get habilitado(): boolean {
    return this.modo !== 'desligado';
  }

  /** Link absoluto para uma rota do frontend. */
  link(caminho: string): string {
    return new URL(caminho, this.config.get('APP_URL', { infer: true })).toString();
  }

  async enviar(m: MensagemEmail): Promise<boolean> {
    if (this.modo === 'desligado') return false;
    const corpo = `${m.texto}\n\n—\nQuizzer · mensagem automática, não responda.`;
    if (this.modo === 'memoria') {
      if (this.falharProximos > 0) {
        this.falharProximos--;
        this.ultimoErro = 'falha simulada';
        return false;
      }
      this.caixaDeSaida.push({ ...m, texto: corpo });
      return true;
    }
    try {
      await this.transporte!.sendMail({
        from: this.config.get('EMAIL_REMETENTE', { infer: true }),
        to: m.para,
        subject: `[Quizzer] ${m.assunto}`,
        text: corpo,
      });
      return true;
    } catch (erro) {
      this.ultimoErro = String(erro).slice(0, 500);
      this.logger.error({ erro: String(erro), assunto: m.assunto }, 'Falha ao enviar e-mail');
      return false;
    }
  }
}
