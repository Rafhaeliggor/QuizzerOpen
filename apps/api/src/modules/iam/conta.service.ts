import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAPEIS_MFA_OBRIGATORIO, type UsuarioAutenticado } from '../../common/auth/tipos.js';
import type { Env } from '../../config/env.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { gerarCodigosRecuperacao, MfaService } from './mfa.service.js';
import { SenhaService } from './senha.service.js';
import { SessaoService } from './sessao.service.js';

/**
 * Autoatendimento da conta (ambos os ambientes): MFA opcional para quem não é obrigado
 * (RF01/RNF05 — "MFA escalonável") e sessões abertas (ADR-0034).
 */
@Injectable()
export class ContaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mfa: MfaService,
    private readonly senhas: SenhaService,
    private readonly sessoes: SessaoService,
    private readonly auditoria: AuditoriaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Registra o aceite dos Termos de Uso e a ciência da Política de Privacidade na versão vigente
   * (LGPD — ADR-0043, ADR-0060). Recusa o aceite de um texto que não é mais o vigente.
   */
  async aceitarPolitica(u: UsuarioAutenticado, versaoLida?: string) {
    const versao = this.config.get('POLITICA_VERSAO', { infer: true });
    if (versaoLida && versaoLida !== versao) {
      throw new ConflictException('Os termos foram atualizados. Recarregue a página para ler a versão vigente.');
    }
    await this.prisma.usuario.update({
      where: { id: u.id },
      data: { politicaAceitaEm: new Date(), politicaVersao: versao },
    });
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'POLITICA_ACEITA', recurso: 'usuario', recursoId: u.id, dados: { versao } });
    return { versao };
  }

  async preferencias(u: UsuarioAutenticado, p: { notificacoesPorEmail?: boolean }) {
    return this.prisma.usuario.update({
      where: { id: u.id },
      data: p.notificacoesPorEmail !== undefined ? { notificacoesPorEmail: p.notificacoesPorEmail } : {},
      select: { notificacoesPorEmail: true },
    });
  }

  async situacaoMfa(u: UsuarioAutenticado) {
    const usuario = await this.buscar(u.id);
    return {
      habilitado: usuario.mfaHabilitado,
      obrigatorio: PAPEIS_MFA_OBRIGATORIO.includes(usuario.papel),
      codigosRecuperacaoRestantes: usuario.mfaHabilitado ? usuario.mfaCodigosRecuperacao.length : 0,
    };
  }

  /** Gera (ou regera) o segredo; só vale depois de confirmado com um código. */
  async iniciarMfa(u: UsuarioAutenticado) {
    const usuario = await this.buscar(u.id);
    if (usuario.mfaHabilitado) throw new ConflictException('A verificação em duas etapas já está ativa');
    const segredo = this.mfa.gerarSegredo();
    await this.prisma.usuario.update({
      where: { id: u.id },
      data: { mfaSegredoCifrado: this.mfa.cifrarSegredo(segredo), mfaUltimoPasso: null },
    });
    return this.mfa.gerarDadosCadastro(segredo, usuario.email);
  }

  async confirmarMfa(u: UsuarioAutenticado, codigo: string) {
    const usuario = await this.buscar(u.id);
    if (usuario.mfaHabilitado) throw new ConflictException('A verificação em duas etapas já está ativa');
    if (!usuario.mfaSegredoCifrado) throw new BadRequestException('Comece o cadastro antes de confirmar');
    const r = await this.mfa.verificarCodigo(this.mfa.decifrarSegredo(usuario.mfaSegredoCifrado), codigo, null);
    if (!r.valido || r.passo == null) {
      throw new BadRequestException({ message: 'Código de verificação inválido', codigo: 'MFA_CODIGO_INVALIDO' });
    }
    const { codigos, hashes } = gerarCodigosRecuperacao();
    const confirmado = await this.prisma.usuario.updateMany({
      where: { id: u.id, mfaHabilitado: false, mfaSegredoCifrado: usuario.mfaSegredoCifrado, mfaUltimoPasso: null },
      data: { mfaHabilitado: true, mfaUltimoPasso: BigInt(r.passo), mfaCodigosRecuperacao: hashes },
    });
    if (confirmado.count !== 1) throw new ConflictException('Cadastro de MFA alterado; tente novamente');
    // Outras sessões foram abertas sem o segundo fator: encerra.
    await this.sessoes.revogarOutras(u.id, u.sessaoId);
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'MFA_ATIVADO', recurso: 'usuario', recursoId: u.id });
    return { habilitado: true, codigosRecuperacao: codigos };
  }

  /** Gera um novo conjunto de códigos de recuperação (invalida os anteriores). Exige o código do app. */
  async novosCodigosRecuperacao(u: UsuarioAutenticado, codigo: string) {
    const usuario = await this.buscar(u.id);
    if (!usuario.mfaHabilitado || !usuario.mfaSegredoCifrado) {
      throw new ConflictException('Ative a verificação em duas etapas primeiro');
    }
    const r = await this.mfa.verificarCodigo(
      this.mfa.decifrarSegredo(usuario.mfaSegredoCifrado),
      codigo,
      usuario.mfaUltimoPasso != null ? Number(usuario.mfaUltimoPasso) : null,
    );
    if (!r.valido || r.passo == null) {
      throw new BadRequestException({ message: 'Código de verificação inválido', codigo: 'MFA_CODIGO_INVALIDO' });
    }
    const { codigos, hashes } = gerarCodigosRecuperacao();
    const atualizado = await this.prisma.usuario.updateMany({
      where: {
        id: u.id,
        mfaHabilitado: true,
        mfaSegredoCifrado: usuario.mfaSegredoCifrado,
        mfaUltimoPasso: usuario.mfaUltimoPasso,
      },
      data: { mfaCodigosRecuperacao: hashes, mfaUltimoPasso: BigInt(r.passo) },
    });
    if (atualizado.count !== 1) throw new ConflictException('Código já utilizado; solicite um novo código');
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'MFA_CODIGOS_GERADOS', recurso: 'usuario', recursoId: u.id });
    return { codigosRecuperacao: codigos };
  }

  /** Desativar exige senha e código atual. Papéis com MFA obrigatório não podem. */
  async desativarMfa(u: UsuarioAutenticado, senha: string, codigo: string) {
    const usuario = await this.buscar(u.id);
    if (PAPEIS_MFA_OBRIGATORIO.includes(usuario.papel)) {
      throw new ConflictException('Para o seu papel a verificação em duas etapas é obrigatória');
    }
    if (!usuario.mfaHabilitado || !usuario.mfaSegredoCifrado) return { habilitado: false };
    if (!(await this.senhas.verificar(usuario.senhaHash, senha))) {
      throw new UnauthorizedException('Senha incorreta');
    }
    const r = await this.mfa.verificarCodigo(
      this.mfa.decifrarSegredo(usuario.mfaSegredoCifrado),
      codigo,
      usuario.mfaUltimoPasso != null ? Number(usuario.mfaUltimoPasso) : null,
    );
    if (!r.valido || r.passo == null) {
      throw new BadRequestException({ message: 'Código de verificação inválido', codigo: 'MFA_CODIGO_INVALIDO' });
    }
    const desativado = await this.prisma.usuario.updateMany({
      where: {
        id: u.id,
        mfaHabilitado: true,
        mfaSegredoCifrado: usuario.mfaSegredoCifrado,
        mfaUltimoPasso: usuario.mfaUltimoPasso,
      },
      data: { mfaHabilitado: false, mfaSegredoCifrado: null, mfaUltimoPasso: null, mfaCodigosRecuperacao: [] },
    });
    if (desativado.count !== 1) throw new ConflictException('Código já utilizado; tente novamente');
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'MFA_DESATIVADO', recurso: 'usuario', recursoId: u.id });
    return { habilitado: false };
  }

  /** Sessões ativas (não revogadas nem expiradas), a atual marcada. */
  async sessoesAtivas(u: UsuarioAutenticado) {
    const sessoes = await this.prisma.sessao.findMany({
      where: { usuarioId: u.id, revogadaEm: null, expiraEm: { gt: new Date() } },
      orderBy: { ultimoUsoEm: 'desc' },
      select: { id: true, ambiente: true, ip: true, userAgent: true, criadoEm: true, ultimoUsoEm: true },
    });
    return sessoes.map((s) => ({ ...s, atual: s.id === u.sessaoId }));
  }

  async encerrarSessao(u: UsuarioAutenticado, sessaoId: string) {
    const s = await this.prisma.sessao.findFirst({ where: { id: sessaoId, usuarioId: u.id } });
    if (!s) throw new NotFoundException('Sessão não encontrada');
    await this.sessoes.revogar(sessaoId);
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'SESSAO_ENCERRADA', recurso: 'sessao', recursoId: sessaoId });
    return { atual: sessaoId === u.sessaoId };
  }

  async encerrarOutras(u: UsuarioAutenticado) {
    await this.sessoes.revogarOutras(u.id, u.sessaoId);
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'SESSOES_ENCERRADAS', recurso: 'sessao' });
    return { ok: true };
  }

  private async buscar(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario || !usuario.ativo) throw new UnauthorizedException();
    return usuario;
  }
}
