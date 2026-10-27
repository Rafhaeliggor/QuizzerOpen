import { Injectable, Logger, OnModuleDestroy, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  AccessTokenPayload,
  AUDIENCIA_ACCESS,
  AUDIENCIA_MFA,
  MfaTokenPayload,
} from '../../common/auth/tipos.js';
import type { Env } from '../../config/env.js';
import type { Ambiente, Papel } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface ContextoRequisicao {
  ip?: string;
  userAgent?: string;
}

/**
 * Janela em que o refresh anterior ainda vale após a rotação: duas requisições quase simultâneas
 * (duas abas, ou a renovação automática junto com uma nova tentativa após 401) apresentam o mesmo
 * token; a que perde a corrida recebe só um access token, sem derrubar a sessão.
 */
export const TOLERANCIA_ROTACAO_MS = 30_000;

/** Resultado da renovação: sem `refreshToken`, o cookie atual (do vencedor da corrida) continua valendo. */
export interface TokensRenovados {
  accessToken: string;
  refreshToken?: string;
  refreshExpiraEm?: Date;
}

export interface TokensEmitidos {
  accessToken: string;
  /** Formato `<sessaoId>.<segredo>` — vai somente em cookie httpOnly. */
  refreshToken: string;
  refreshExpiraEm: Date;
}

interface UsuarioParaToken {
  id: string;
  papel: Papel;
  trocarSenha: boolean;
}

/**
 * Emissão de tokens e ciclo de vida da sessão:
 * - access token: JWT curto (padrão 15 min), stateless;
 * - refresh token: opaco, guardado só como hash SHA-256 e rotacionado a cada uso;
 *   reuso de um refresh antigo revoga a sessão (indício de roubo).
 */
/** Por quanto tempo o guard confia no resultado da checagem de sessão (ADR-0027). */
const CACHE_SESSAO_MS = 30_000;
const CACHE_SESSAO_MAX = 10_000;
/** Sessões expiradas/revogadas há mais que isso são apagadas (o login fica na auditoria). */
const RETENCAO_SESSOES_DIAS = 30;
const INTERVALO_LIMPEZA_MS = 6 * 3600_000;

@Injectable()
export class SessaoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessaoService.name);
  private limpeza?: NodeJS.Timeout;
  /** sessaoId → { ativa, validoAte }. Cache local por instância da API. */
  private readonly cacheSessoes = new Map<string, { ativa: boolean; validoAte: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    const rodar = () =>
      this.limparAntigas()
        .then((n) => n && this.logger.log(`${n} sessões antigas removidas`))
        .catch((erro: unknown) => this.logger.error({ erro }, 'Falha na limpeza de sessões'));
    setTimeout(rodar, 60_000).unref();
    this.limpeza = setInterval(rodar, INTERVALO_LIMPEZA_MS);
    this.limpeza.unref();
  }

  onModuleDestroy() {
    if (this.limpeza) clearInterval(this.limpeza);
  }

  /** Remove sessões expiradas ou revogadas há mais de 30 dias. */
  async limparAntigas(agora = new Date()): Promise<number> {
    const limite = new Date(agora.getTime() - RETENCAO_SESSOES_DIAS * 86_400_000);
    const { count } = await this.prisma.sessao.deleteMany({
      where: { OR: [{ expiraEm: { lt: limite } }, { revogadaEm: { lt: limite } }] },
    });
    return count;
  }

  emitirAccessToken(
    usuario: UsuarioParaToken,
    ambiente: Ambiente,
    sessaoId: string,
  ) {
    const payload: AccessTokenPayload = {
      sub: usuario.id,
      papel: usuario.papel,
      amb: ambiente,
      sid: sessaoId,
      trs: usuario.trocarSenha,
    };
    return this.jwt.signAsync(payload, {
      audience: AUDIENCIA_ACCESS,
      expiresIn: this.config.get('JWT_ACCESS_TTL_SEG', { infer: true }),
    });
  }

  emitirMfaToken(payload: MfaTokenPayload) {
    return this.jwt.signAsync(payload, {
      audience: AUDIENCIA_MFA,
      expiresIn: this.config.get('JWT_MFA_TTL_SEG', { infer: true }),
    });
  }

  async verificarMfaToken(token: string): Promise<MfaTokenPayload> {
    try {
      return await this.jwt.verifyAsync<MfaTokenPayload>(token, {
        audience: AUDIENCIA_MFA,
      });
    } catch {
      throw new UnauthorizedException({
        message: 'Sessão de verificação expirada. Faça login novamente.',
        codigo: 'MFA_TOKEN_INVALIDO',
      });
    }
  }

  async criarSessao(
    usuario: UsuarioParaToken,
    ambiente: Ambiente,
    ctx: ContextoRequisicao,
  ): Promise<TokensEmitidos> {
    const segredo = this.gerarSegredo();
    const expiraEm = this.calcularExpiracao();
    const sessao = await this.prisma.sessao.create({
      data: {
        usuarioId: usuario.id,
        ambiente,
        refreshTokenHash: this.hashSegredo(segredo),
        expiraEm,
        ip: ctx.ip,
        userAgent: ctx.userAgent?.slice(0, 500),
      },
    });
    return {
      accessToken: await this.emitirAccessToken(usuario, ambiente, sessao.id),
      refreshToken: `${sessao.id}.${segredo}`,
      refreshExpiraEm: expiraEm,
    };
  }

  /** Valida e rotaciona o refresh token, devolvendo novos tokens. */
  async renovar(refreshToken: string | undefined): Promise<TokensRenovados> {
    const invalido = () =>
      new UnauthorizedException({
        message: 'Sessão inválida ou expirada',
        codigo: 'SESSAO_INVALIDA',
      });

    const [sessaoId, segredo] = refreshToken?.split('.') ?? [];
    if (!sessaoId || !segredo || !/^[0-9a-f-]{36}$/i.test(sessaoId))
      throw invalido();

    const sessao = await this.prisma.sessao.findUnique({
      where: { id: sessaoId },
      include: { usuario: true },
    });
    if (!sessao || sessao.revogadaEm || sessao.expiraEm <= new Date())
      throw invalido();

    const atual = this.hashConfere(segredo, sessao.refreshTokenHash);
    const anteriorNaJanela =
      !atual &&
      !!sessao.refreshAnteriorHash &&
      !!sessao.rotacionadaEm &&
      Date.now() - sessao.rotacionadaEm.getTime() <= TOLERANCIA_ROTACAO_MS &&
      this.hashConfere(segredo, sessao.refreshAnteriorHash);
    if (!atual && !anteriorNaJanela) {
      // Refresh já rotacionado sendo reapresentado fora da janela: revoga a sessão inteira.
      await this.revogar(sessao.id);
      throw invalido();
    }

    const { usuario } = sessao;
    if (
      !usuario.ativo ||
      (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date())
    ) {
      await this.revogar(sessao.id);
      throw invalido();
    }

    const soAcesso = async () => ({
      accessToken: await this.emitirAccessToken(usuario, sessao.ambiente, sessao.id),
    });
    if (anteriorNaJanela) return soAcesso();

    const novoSegredo = this.gerarSegredo();
    const expiraEm = this.calcularExpiracao();
    // Condicional ao hash lido: se outra requisição rotacionou no meio, esta perde a corrida e
    // não sobrescreve o token do vencedor.
    const { count } = await this.prisma.sessao.updateMany({
      where: { id: sessao.id, refreshTokenHash: sessao.refreshTokenHash, revogadaEm: null },
      data: {
        refreshTokenHash: this.hashSegredo(novoSegredo),
        refreshAnteriorHash: sessao.refreshTokenHash,
        rotacionadaEm: new Date(),
        expiraEm,
        ultimoUsoEm: new Date(),
      },
    });
    if (count === 0) return soAcesso();

    return {
      accessToken: await this.emitirAccessToken(
        usuario,
        sessao.ambiente,
        sessao.id,
      ),
      refreshToken: `${sessao.id}.${novoSegredo}`,
      refreshExpiraEm: expiraEm,
    };
  }

  /**
   * A sessão do access token ainda vale? (não revogada, não expirada, usuário ativo)
   * Com o cache de 30 s, desativação/logout/troca de papel cortam o acesso em até 30 s,
   * em vez de esperar os 15 min de validade do JWT.
   */
  async estaAtiva(sessaoId: string): Promise<boolean> {
    const agora = Date.now();
    const emCache = this.cacheSessoes.get(sessaoId);
    if (emCache && emCache.validoAte > agora) return emCache.ativa;
    const sessao = await this.prisma.sessao.findUnique({
      where: { id: sessaoId },
      select: { revogadaEm: true, expiraEm: true, usuario: { select: { ativo: true } } },
    });
    const ativa = !!sessao && !sessao.revogadaEm && sessao.expiraEm > new Date() && sessao.usuario.ativo;
    if (this.cacheSessoes.size >= CACHE_SESSAO_MAX) this.cacheSessoes.clear();
    this.cacheSessoes.set(sessaoId, { ativa, validoAte: agora + CACHE_SESSAO_MS });
    return ativa;
  }

  async revogar(sessaoId: string): Promise<void> {
    this.cacheSessoes.delete(sessaoId);
    await this.prisma.sessao.updateMany({
      where: { id: sessaoId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
  }

  /** Encerra todas as sessões do usuário (desativação, mudança de papel, reset de senha). */
  async revogarTodas(usuarioId: string): Promise<void> {
    this.cacheSessoes.clear();
    await this.prisma.sessao.updateMany({
      where: { usuarioId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
  }

  async revogarOutras(usuarioId: string, sessaoAtualId: string): Promise<void> {
    this.cacheSessoes.clear();
    await this.prisma.sessao.updateMany({
      where: { usuarioId, revogadaEm: null, id: { not: sessaoAtualId } },
      data: { revogadaEm: new Date() },
    });
  }

  private gerarSegredo(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashSegredo(segredo: string): string {
    return createHash('sha256').update(segredo).digest('hex');
  }

  private hashConfere(segredo: string, hashEsperado: string): boolean {
    const a = Buffer.from(this.hashSegredo(segredo), 'hex');
    const b = Buffer.from(hashEsperado, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private calcularExpiracao(): Date {
    const dias = this.config.get('REFRESH_TTL_DIAS', { infer: true });
    return new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  }
}
