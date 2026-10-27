import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ambienteDoPapel,
  PAPEIS_MFA_OBRIGATORIO,
  UsuarioAutenticado,
} from '../../common/auth/tipos.js';
import type { Env } from '../../config/env.js';
import type { Usuario } from '../../generated/prisma/client.js';
import type { Ambiente } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { hashCodigoRecuperacao, MfaService } from './mfa.service.js';
import { PermissoesService } from './permissoes.service.js';
import { SenhaService } from './senha.service.js';
import {
  ContextoRequisicao,
  SessaoService,
  TokensEmitidos,
} from './sessao.service.js';

export type ResultadoLogin =
  | { status: 'AUTENTICADO'; tokens: TokensEmitidos; usuario: UsuarioPublico }
  | { status: 'MFA_REQUERIDO' | 'MFA_CADASTRO_REQUERIDO'; mfaToken: string };

export interface UsuarioPublico {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
  papel: Usuario['papel'];
  mfaHabilitado: boolean;
  trocarSenha: boolean;
  /** Permissões delegadas (RF02) — a interface mostra os menus correspondentes. */
  permissoes: string[];
  notificacoesPorEmail: boolean;
  /** Falta registrar ciência da versão vigente da política de privacidade (LGPD). */
  politicaPendente?: boolean;
}

export function paraUsuarioPublico(u: Usuario, permissoes: string[] = [], versaoPolitica?: string): UsuarioPublico {
  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    matricula: u.matricula,
    papel: u.papel,
    mfaHabilitado: u.mfaHabilitado,
    trocarSenha: u.trocarSenha,
    permissoes,
    notificacoesPorEmail: u.notificacoesPorEmail,
    ...(versaoPolitica ? { politicaPendente: u.politicaVersao !== versaoPolitica } : {}),
  };
}

/**
 * Mesma resposta para conta inexistente, senha errada e conta bloqueada (não revela quais contas
 * existem — BUG-048). A dica do bloqueio vale para todos; o titular é avisado por notificação.
 */
const MENSAGEM_CREDENCIAIS =
  'Credenciais inválidas. Depois de várias tentativas erradas, o acesso fica bloqueado por alguns minutos.';

/** Fluxo RF01 — Autenticar-se no Sistema (diagrama de atividade, Figura 4). */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly senhas: SenhaService,
    private readonly mfa: MfaService,
    private readonly sessoes: SessaoService,
    private readonly config: ConfigService<Env, true>,
    private readonly auditoria: AuditoriaService,
    private readonly notificacoes: NotificacoesService,
    private readonly permissoes: PermissoesService,
  ) {}

  /**
   * Passos 1–4: valida credenciais no ambiente indicado e decide se exige MFA.
   * Profissional entra por e-mail; aluno por e-mail ou matrícula.
   */
  async login(
    ambiente: Ambiente,
    identificador: string,
    senha: string,
    ctx: ContextoRequisicao,
  ): Promise<ResultadoLogin> {
    const id = identificador.trim();
    const usuario = await this.prisma.usuario.findFirst({
      where:
        ambiente === 'ALUNO'
          ? { OR: [{ email: id.toLowerCase() }, { matricula: id }] }
          : { email: id.toLowerCase() },
    });

    if (!usuario) {
      await this.senhas.verificarFicticio(senha);
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    }

    // Bloqueada: a senha é verificada mesmo assim (mesmo tempo de resposta) e a resposta é a genérica.
    const bloqueada = !!usuario.bloqueadoAte && usuario.bloqueadoAte > new Date();
    const senhaOk = await this.senhas.verificar(usuario.senhaHash, senha);
    if (bloqueada) throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    if (!senhaOk) {
      await this.registrarFalha(usuario, ctx, 'senha');
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    }

    // Re-hash transparente: senhas antigas migram para os parâmetros atuais (ADR-0023).
    if (this.senhas.precisaRehash(usuario.senhaHash)) {
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { senhaHash: await this.senhas.hash(senha) },
      });
    }

    // Isolamento entre ambientes: senha correta no portal errado não autentica,
    // mas também não conta como tentativa de força bruta.
    if (!usuario.ativo || ambienteDoPapel(usuario.papel) !== ambiente) {
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    }

    if (usuario.mfaHabilitado) {
      return {
        status: 'MFA_REQUERIDO',
        mfaToken: await this.sessoes.emitirMfaToken({
          sub: usuario.id,
          amb: ambiente,
          fin: 'verificacao',
        }),
      };
    }
    if (PAPEIS_MFA_OBRIGATORIO.includes(usuario.papel)) {
      return {
        status: 'MFA_CADASTRO_REQUERIDO',
        mfaToken: await this.sessoes.emitirMfaToken({
          sub: usuario.id,
          amb: ambiente,
          fin: 'cadastro',
        }),
      };
    }

    return this.concluirLogin(usuario, ambiente, ctx);
  }

  /** Primeiro acesso de papel com MFA obrigatório: gera (ou regera) o segredo TOTP. */
  async iniciarCadastroMfa(mfaToken: string) {
    const payload = await this.sessoes.verificarMfaToken(mfaToken);
    if (payload.fin !== 'cadastro')
      throw new BadRequestException('MFA já cadastrado para este usuário');

    const usuario = await this.buscarAtivo(payload.sub);
    if (usuario.mfaHabilitado)
      throw new BadRequestException('MFA já cadastrado para este usuário');

    const segredo = this.mfa.gerarSegredo();
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        mfaSegredoCifrado: this.mfa.cifrarSegredo(segredo),
        mfaUltimoPasso: null,
      },
    });
    return this.mfa.gerarDadosCadastro(segredo, usuario.email);
  }

  /** Alternativa do passo 3: valida o código TOTP e conclui o login. */
  async verificarMfa(
    mfaToken: string,
    codigo: string,
    ctx: ContextoRequisicao,
  ): Promise<ResultadoLogin> {
    const payload = await this.sessoes.verificarMfaToken(mfaToken);
    const usuario = await this.buscarAtivo(payload.sub);
    this.garantirNaoBloqueado(usuario);

    if (!usuario.mfaSegredoCifrado) {
      throw new BadRequestException('Cadastro de MFA não iniciado');
    }

    // Código de recuperação (perdeu o celular): uso único, só no login (ADR-0042).
    if (!/^\d{6}$/.test(codigo)) {
      const h = hashCodigoRecuperacao(codigo);
      if (payload.fin !== 'verificacao' || !usuario.mfaHabilitado || !usuario.mfaCodigosRecuperacao.includes(h)) {
        await this.registrarFalha(usuario, ctx, 'mfa');
        throw new UnauthorizedException({ message: 'Código de recuperação inválido', codigo: 'MFA_CODIGO_INVALIDO' });
      }
      // array_remove executa no banco sob lock da linha; duas requisições com o
      // mesmo código não podem consumir a mesma cópia de um array lido antes.
      const consumidos = await this.prisma.$executeRaw`
        UPDATE iam.usuarios
        SET mfa_codigos_recuperacao = array_remove(mfa_codigos_recuperacao, ${h})
        WHERE id = ${usuario.id}::uuid
          AND mfa_codigos_recuperacao @> ARRAY[${h}]::text[]
      `;
      if (consumidos !== 1) {
        await this.registrarFalha(usuario, ctx, 'mfa');
        throw new UnauthorizedException({ message: 'Código de recuperação inválido', codigo: 'MFA_CODIGO_INVALIDO' });
      }
      const atualizado = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
      const restantes = atualizado.mfaCodigosRecuperacao;
      await this.auditoria.registrar({
        usuarioId: usuario.id,
        acao: 'MFA_CODIGO_RECUPERACAO_USADO',
        recurso: 'usuario',
        recursoId: usuario.id,
        ip: ctx.ip,
        dados: { restantes: restantes.length },
      });
      await this.notificacoes.notificar([usuario.id], {
        tipo: 'MFA_RECUPERACAO_USADA',
        titulo: 'Código de recuperação usado',
        mensagem: `Um código de recuperação foi usado para entrar na sua conta. Restam ${restantes.length}. Se não foi você, troque a senha e avise a administração.`,
        link: payload.amb === 'ALUNO' ? '/aluno/conta' : '/app/conta',
      });
      return this.concluirLogin(atualizado, payload.amb, ctx);
    }

    const resultado = await this.mfa.verificarCodigo(
      this.mfa.decifrarSegredo(usuario.mfaSegredoCifrado),
      codigo,
      usuario.mfaUltimoPasso != null ? Number(usuario.mfaUltimoPasso) : null,
    );
    if (!resultado.valido || resultado.passo == null) {
      await this.registrarFalha(usuario, ctx, 'mfa');
      throw new UnauthorizedException({
        message: 'Código de verificação inválido',
        codigo: 'MFA_CODIGO_INVALIDO',
      });
    }

    const reivindicado = await this.prisma.usuario.updateMany({
      where: {
        id: usuario.id,
        mfaSegredoCifrado: usuario.mfaSegredoCifrado,
        mfaUltimoPasso: usuario.mfaUltimoPasso,
        ...(payload.fin === 'cadastro' ? { mfaHabilitado: false } : { mfaHabilitado: true }),
      },
      data: {
        mfaUltimoPasso: BigInt(resultado.passo),
        ...(payload.fin === 'cadastro' ? { mfaHabilitado: true } : {}),
      },
    });
    if (reivindicado.count !== 1) {
      await this.registrarFalha(usuario, ctx, 'mfa');
      throw new UnauthorizedException({
        message: 'Código de verificação inválido ou já utilizado',
        codigo: 'MFA_CODIGO_INVALIDO',
      });
    }
    const atualizado = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
    if (payload.fin === 'cadastro') {
      await this.auditoria.registrar({
        usuarioId: usuario.id,
        acao: 'MFA_ATIVADO',
        recurso: 'usuario',
        recursoId: usuario.id,
        ip: ctx.ip,
      });
    }
    return this.concluirLogin(atualizado, payload.amb, ctx);
  }

  async trocarSenha(
    atual: UsuarioAutenticado,
    senhaAtual: string,
    novaSenha: string,
  ) {
    const usuario = await this.buscarAtivo(atual.id);
    if (!(await this.senhas.verificar(usuario.senhaHash, senhaAtual))) {
      throw new BadRequestException('Senha atual incorreta');
    }
    if (senhaAtual === novaSenha) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }
    const atualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash: await this.senhas.hash(novaSenha),
        trocarSenha: false,
      },
    });
    // Troca de senha encerra as demais sessões do usuário.
    await this.sessoes.revogarOutras(usuario.id, atual.sessaoId);
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'SENHA_ALTERADA',
      recurso: 'usuario',
      recursoId: usuario.id,
    });
    return {
      accessToken: await this.sessoes.emitirAccessToken(
        atualizado,
        atual.ambiente,
        atual.sessaoId,
      ),
      usuario: paraUsuarioPublico(
        atualizado,
        await this.permissoes.doUsuario(atualizado.id),
        this.config.get('POLITICA_VERSAO', { infer: true }),
      ),
    };
  }

  async perfil(usuarioId: string): Promise<UsuarioPublico> {
    return paraUsuarioPublico(
      await this.buscarAtivo(usuarioId),
      await this.permissoes.doUsuario(usuarioId),
      this.config.get('POLITICA_VERSAO', { infer: true }),
    );
  }

  private async concluirLogin(
    usuario: Usuario,
    ambiente: Ambiente,
    ctx: ContextoRequisicao,
  ): Promise<ResultadoLogin> {
    const atualizado = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasLoginFalha: 0,
        bloqueadoAte: null,
        ultimoLoginEm: new Date(),
      },
    });
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'LOGIN',
      recurso: 'sessao',
      dados: { ambiente },
      ip: ctx.ip,
    });
    return {
      status: 'AUTENTICADO',
      tokens: await this.sessoes.criarSessao(atualizado, ambiente, ctx),
      usuario: paraUsuarioPublico(
        atualizado,
        await this.permissoes.doUsuario(atualizado.id),
        this.config.get('POLITICA_VERSAO', { infer: true }),
      ),
    };
  }

  private async buscarAtivo(id: string): Promise<Usuario> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario || !usuario.ativo)
      throw new UnauthorizedException(MENSAGEM_CREDENCIAIS);
    return usuario;
  }

  private garantirNaoBloqueado(usuario: Usuario): void {
    if (usuario.bloqueadoAte && usuario.bloqueadoAte > new Date()) {
      throw new HttpException(
        {
          message:
            'Conta temporariamente bloqueada por excesso de tentativas. Tente novamente mais tarde.',
          codigo: 'CONTA_BLOQUEADA',
          bloqueadoAte: usuario.bloqueadoAte.toISOString(),
        },
        HttpStatus.LOCKED,
      );
    }
  }

  /** Exceção do RF01: incrementa o contador e bloqueia ao atingir o limite. */
  private async registrarFalha(
    usuario: Usuario,
    ctx: ContextoRequisicao,
    etapa: 'senha' | 'mfa',
  ): Promise<void> {
    const max = this.config.get('LOGIN_MAX_TENTATIVAS', { infer: true });
    const { tentativasLoginFalha } = await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { tentativasLoginFalha: { increment: 1 } },
      select: { tentativasLoginFalha: true },
    });
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'LOGIN_FALHA',
      recurso: 'sessao',
      dados: { etapa, tentativa: tentativasLoginFalha },
      ip: ctx.ip,
    });
    if (tentativasLoginFalha < max) return;

    const minutos = this.config.get('LOGIN_BLOQUEIO_MIN', { infer: true });
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tentativasLoginFalha: 0,
        bloqueadoAte: new Date(Date.now() + minutos * 60_000),
      },
    });
    await this.auditoria.registrar({
      usuarioId: usuario.id,
      acao: 'CONTA_BLOQUEADA',
      recurso: 'usuario',
      recursoId: usuario.id,
      dados: { minutos },
      ip: ctx.ip,
    });
    // Notifica o titular (RF01 — exceção). Aparece no próximo acesso.
    await this.notificacoes.notificar([usuario.id], {
      tipo: 'CONTA_BLOQUEADA',
      titulo: 'Sua conta foi bloqueada temporariamente',
      mensagem: `Detectamos ${max} tentativas de acesso inválidas e bloqueamos a conta por ${minutos} minutos. Se não foi você, procure a coordenação.`,
    });
    this.logger.warn(
      { usuarioId: usuario.id, minutos },
      'Conta bloqueada por excesso de tentativas',
    );
  }
}
