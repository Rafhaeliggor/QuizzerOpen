import { Injectable, Logger, NotFoundException, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import type { Prisma } from '../../generated/prisma/client.js';
import { EmailService } from '../../infra/email/email.service.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { TempoRealService } from './tempo-real.service.js';

export interface NovaNotificacao {
  tipo:
    | 'PROVA_DISPONIVEL'
    | 'RESULTADO_PUBLICADO'
    | 'RECURSO_ABERTO'
    | 'RECURSO_DECIDIDO'
    | 'NOTA_REPROCESSADA'
    | 'CONTA_BLOQUEADA'
    | 'LGPD_SOLICITACAO'
    | 'MFA_RECUPERACAO_USADA'
    | 'CORRECAO_ARBITRAGEM';
  titulo: string;
  mensagem: string;
  link?: string;
}

const INTERVALO_LIMPEZA_MS = 6 * 3600_000;

/** Notificações in-app (RF10), com sinal em tempo real e cópia opcional por e-mail. */
@Injectable()
export class NotificacoesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificacoesService.name);
  private limpeza?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly tempoReal: TempoRealService,
    // Resolução tardia do UsuariosService (ver enviarEmails).
    private readonly moduleRef: ModuleRef,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const rodar = () =>
      this.limparAntigas()
        .then((n) => n && this.logger.log(`${n} notificações lidas antigas removidas`))
        .catch((erro: unknown) => this.logger.error({ erro }, 'Falha na limpeza de notificações'));
    setTimeout(rodar, 90_000).unref();
    this.limpeza = setInterval(rodar, INTERVALO_LIMPEZA_MS);
    this.limpeza.unref();
  }

  onModuleDestroy() {
    if (this.limpeza) clearInterval(this.limpeza);
  }

  /**
   * Retenção (AJ-113): apaga as notificações JÁ LIDAS criadas há mais de
   * NOTIFICACOES_RETENCAO_DIAS (180; 0 desliga). As não lidas ficam até serem lidas.
   */
  async limparAntigas(agora = new Date()): Promise<number> {
    const dias = this.config.get('NOTIFICACOES_RETENCAO_DIAS', { infer: true });
    if (!dias) return 0;
    const { count } = await this.prisma.notificacao.deleteMany({
      where: { lida: true, criadoEm: { lt: new Date(agora.getTime() - dias * 86_400_000) } },
    });
    return count;
  }

  /** Nunca derruba a operação de negócio que gerou a notificação. */
  async notificar(usuarioIds: (string | null | undefined)[], n: NovaNotificacao): Promise<void> {
    const ids = [...new Set(usuarioIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return;
    try {
      await this.prisma.notificacao.createMany({
        data: ids.map((usuarioId) => ({ usuarioId, ...n, link: n.link ?? null })),
      });
    } catch (erro) {
      this.logger.error({ erro, tipo: n.tipo }, 'Falha ao criar notificações');
    }
    void this.tempoReal.publicar(ids.map((usuarioId) => ({ usuarioId, titulo: n.titulo })));
    // Cópia por e-mail (ADR-0041) — em segundo plano: SMTP lento não atrasa a resposta.
    if (this.email.habilitado) void this.enviarEmails(ids, n);
  }

  private async enviarEmails(ids: string[], n: NovaNotificacao) {
    try {
      // Import dinâmico: um import estático fecharia o ciclo notificações → usuários → IAM → notificações.
      const { UsuariosService } = await import('../usuarios/usuarios.service.js');
      const usuarios = this.moduleRef.get(UsuariosService, { strict: false });
      for (const c of await usuarios.contatosParaEmail(ids)) {
        await this.email.enfileirar({
          para: c.email,
          assunto: n.titulo,
          texto: `Olá, ${c.nome}.\n\n${n.mensagem}${n.link ? `\n\nAcesse: ${this.email.link(n.link)}` : ''}\n\nPara não receber estes avisos por e-mail, desligue a opção em "Minha conta".`,
        });
      }
    } catch (erro) {
      this.logger.error({ erro: String(erro), tipo: n.tipo }, 'Falha ao enviar notificações por e-mail');
    }
  }

  async listar(usuarioId: string) {
    const [naoLidas, itens] = await this.prisma.$transaction([
      this.prisma.notificacao.count({ where: { usuarioId, lida: false } }),
      this.prisma.notificacao.findMany({
        where: { usuarioId },
        orderBy: { criadoEm: 'desc' },
        take: 30,
      }),
    ]);
    return { naoLidas, itens };
  }

  async marcarLida(usuarioId: string, id: string) {
    const { count } = await this.prisma.notificacao.updateMany({
      where: { id, usuarioId },
      data: { lida: true },
    });
    if (count === 0) throw new NotFoundException('Notificação não encontrada');
  }

  async excluirDoUsuario(usuarioId: string, tx: Prisma.TransactionClient): Promise<number> {
    return (await tx.notificacao.deleteMany({ where: { usuarioId } })).count;
  }

  async marcarTodas(usuarioId: string) {
    await this.prisma.notificacao.updateMany({
      where: { usuarioId, lida: false },
      data: { lida: true },
    });
  }
}
