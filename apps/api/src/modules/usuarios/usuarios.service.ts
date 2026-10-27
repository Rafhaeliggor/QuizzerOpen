import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import type { Usuario } from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { paraUsuarioPublico } from '../iam/auth.service.js';
import { SenhaService } from '../iam/senha.service.js';
import { SessaoService } from '../iam/sessao.service.js';
import { PermissoesService } from '../iam/permissoes.service.js';
import { RecuperacaoService } from '../iam/recuperacao.service.js';
import { CriarUsuarioDto, EditarUsuarioDto, ListarUsuariosDto } from './dto.js';

export interface ResumoUsuario {
  id: string;
  nome: string;
  email: string;
  matricula: string | null;
}

export interface DadosAluno {
  nome: string;
  email: string;
  matricula?: string | null;
}

export type ResultadoAluno =
  | { situacao: 'EXISTENTE'; aluno: ResumoUsuario }
  | { situacao: 'CRIADO'; aluno: ResumoUsuario; senhaTemporaria: string; conviteEnviado: boolean };

const SELECAO_RESUMO = { id: true, nome: true, email: true, matricula: true } as const;

/** RF02 — Cadastrar usuário e atribuir papel. Também é a porta de entrada de outros módulos para dados de usuários. */
@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly senhas: SenhaService,
    private readonly auditoria: AuditoriaService,
    private readonly sessoes: SessaoService,
    private readonly permissoes: PermissoesService,
    private readonly recuperacao: RecuperacaoService,
  ) {}

  /**
   * Cria o usuário com senha temporária e troca obrigatória no primeiro login.
   * Com e-mail configurado, o usuário recebe um link para definir a senha (ADR-0041); a senha
   * temporária continua sendo devolvida UMA vez a quem cadastrou, como alternativa.
   */
  async criar(dto: CriarUsuarioDto, autorId?: string) {
    const senhaTemporaria = this.senhas.gerarTemporaria();
    try {
      const usuario = await this.prisma.usuario.create({
        data: {
          nome: dto.nome,
          email: dto.email,
          matricula: dto.matricula || null,
          papel: dto.papel,
          senhaHash: await this.senhas.hash(senhaTemporaria),
          trocarSenha: true,
        },
      });
      await this.auditoria.registrar({
        usuarioId: autorId,
        acao: 'USUARIO_CRIADO',
        recurso: 'usuario',
        recursoId: usuario.id,
        dados: { papel: usuario.papel },
      });
      const conviteEnviado = await this.recuperacao.enviarConvite(usuario.id);
      return { usuario: paraUsuarioPublico(usuario), senhaTemporaria, conviteEnviado };
    } catch (erro) {
      if (
        erro instanceof Prisma.PrismaClientKnownRequestError &&
        erro.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um usuário com este e-mail ou matrícula',
        );
      }
      throw erro;
    }
  }

  async listar(filtro: ListarUsuariosDto) {
    const where: Prisma.UsuarioWhereInput = {
      ...(filtro.papel ? { papel: filtro.papel } : {}),
      ...(filtro.busca
        ? {
            OR: [
              { nome: { contains: filtro.busca, mode: 'insensitive' } },
              { email: { contains: filtro.busca, mode: 'insensitive' } },
              { matricula: { contains: filtro.busca } },
            ],
          }
        : {}),
    };
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.usuario.count({ where }),
      this.prisma.usuario.findMany({
        where,
        orderBy: { nome: 'asc' },
        skip: (filtro.pagina - 1) * filtro.tamanho,
        take: filtro.tamanho,
      }),
    ]);
    return {
      total,
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
      itens: itens.map((u) => ({
        ...paraUsuarioPublico(u),
        ativo: u.ativo,
        bloqueado: !!u.bloqueadoAte && u.bloqueadoAte > new Date(),
      })),
    };
  }

  // ------------------------------------------------- administração (RF02)

  /** Detalhe administrativo: inclui situação de bloqueio, MFA e último acesso. */
  async obter(id: string) {
    const u = await this.buscar(id);
    return {
      ...paraUsuarioPublico(u),
      ativo: u.ativo,
      bloqueadoAte: u.bloqueadoAte && u.bloqueadoAte > new Date() ? u.bloqueadoAte : null,
      tentativasLoginFalha: u.tentativasLoginFalha,
      anonimizadoEm: u.anonimizadoEm,
      ultimoLoginEm: u.ultimoLoginEm,
      criadoEm: u.criadoEm,
      sessoesAtivas: await this.prisma.sessao.count({
        where: { usuarioId: id, revogadaEm: null, expiraEm: { gt: new Date() } },
      }),
    };
  }

  /**
   * Edita dados e papel. Mudar o papel (ou o e-mail de login) encerra as sessões:
   * o token carrega papel e ambiente e precisa ser reemitido.
   */
  async editar(admin: UsuarioAutenticado, id: string, dto: EditarUsuarioDto) {
    const atual = await this.buscar(id);
    if (atual.anonimizadoEm) throw new BadRequestException('Conta anonimizada (LGPD) não pode ser editada');
    if (dto.papel && dto.papel !== atual.papel && id === admin.id) {
      throw new BadRequestException('Você não pode alterar o próprio papel');
    }
    const mudouPapel = !!dto.papel && dto.papel !== atual.papel;
    const mudouEmail = !!dto.email && dto.email !== atual.email;
    try {
      await this.prisma.usuario.update({
        where: { id },
        data: {
          ...(dto.nome ? { nome: dto.nome } : {}),
          ...(dto.email ? { email: dto.email } : {}),
          ...(dto.papel ? { papel: dto.papel } : {}),
          ...(dto.matricula !== undefined ? { matricula: dto.matricula || null } : {}),
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ConflictException('Já existe um usuário com este e-mail ou matrícula');
      }
      throw erro;
    }
    if (mudouPapel || mudouEmail) await this.sessoes.revogarTodas(id);
    // Delegações valem para o papel em que foram dadas (ADR-0033).
    if (mudouPapel) await this.permissoes.revogarTodas(id);
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: mudouPapel ? 'USUARIO_PAPEL_ALTERADO' : 'USUARIO_EDITADO',
      recurso: 'usuario',
      recursoId: id,
      dados: {
        campos: Object.keys(dto).filter((k) => (dto as Record<string, unknown>)[k] !== undefined),
        ...(mudouPapel ? { de: atual.papel, para: dto.papel } : {}),
      },
    });
    return this.obter(id);
  }

  async definirAtivo(admin: UsuarioAutenticado, id: string, ativo: boolean, justificativa: string) {
    if (id === admin.id) throw new BadRequestException('Você não pode desativar a própria conta');
    const u = await this.buscar(id);
    if (u.anonimizadoEm) throw new BadRequestException('Conta anonimizada (LGPD) não pode ser reativada');
    await this.prisma.usuario.update({ where: { id }, data: { ativo } });
    if (!ativo) await this.sessoes.revogarTodas(id);
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: ativo ? 'USUARIO_REATIVADO' : 'USUARIO_DESATIVADO',
      recurso: 'usuario',
      recursoId: id,
      justificativa,
    });
    return this.obter(id);
  }

  /** Gera nova senha temporária (troca obrigatória), desbloqueia e encerra as sessões. */
  async redefinirSenha(admin: UsuarioAutenticado, id: string) {
    const u = await this.buscar(id);
    if (id === admin.id) {
      throw new BadRequestException('Para trocar a própria senha use "Minha conta"');
    }
    const senhaTemporaria = this.senhas.gerarTemporaria();
    await this.prisma.usuario.update({
      where: { id },
      data: {
        senhaHash: await this.senhas.hash(senhaTemporaria),
        trocarSenha: true,
        tentativasLoginFalha: 0,
        bloqueadoAte: null,
      },
    });
    await this.sessoes.revogarTodas(id);
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'USUARIO_SENHA_REDEFINIDA',
      recurso: 'usuario',
      recursoId: u.id,
    });
    return { senhaTemporaria };
  }

  async desbloquear(admin: UsuarioAutenticado, id: string) {
    await this.buscar(id);
    await this.prisma.usuario.update({
      where: { id },
      data: { tentativasLoginFalha: 0, bloqueadoAte: null },
    });
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'USUARIO_DESBLOQUEADO',
      recurso: 'usuario',
      recursoId: id,
    });
    return this.obter(id);
  }

  /** Perda do celular: limpa o segredo TOTP; o próximo login pede novo cadastro de MFA. */
  async resetarMfa(admin: UsuarioAutenticado, id: string, justificativa: string) {
    if (id === admin.id) throw new BadRequestException('Peça a outro administrador para resetar o seu MFA');
    await this.buscar(id);
    await this.prisma.usuario.update({
      where: { id },
      data: { mfaHabilitado: false, mfaSegredoCifrado: null, mfaUltimoPasso: null, mfaCodigosRecuperacao: [] },
    });
    await this.sessoes.revogarTodas(id);
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'USUARIO_MFA_RESETADO',
      recurso: 'usuario',
      recursoId: id,
      justificativa,
    });
    return this.obter(id);
  }

  // ------------------------------------------------- LGPD

  /**
   * Remove os dados pessoais da conta e a desativa de forma permanente. O registro fica
   * (sem nome, e-mail, matrícula, senha utilizável ou MFA) para manter a integridade
   * das notas e da auditoria, que referenciam o id.
   */
  async anonimizar(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.usuario.update({
      where: { id },
      data: {
        nome: 'Titular anonimizado',
        email: `anonimizado+${id}@anonimizado.invalid`,
        matricula: null,
        senhaHash: await this.senhas.hash(this.senhas.gerarTemporaria(32)),
        trocarSenha: false,
        ativo: false,
        mfaHabilitado: false,
        mfaSegredoCifrado: null,
        mfaCodigosRecuperacao: [],
        mfaUltimoPasso: null,
        tentativasLoginFalha: 0,
        bloqueadoAte: null,
        ultimoLoginEm: null,
        anonimizadoEm: new Date(),
      },
    });
    await tx.sessao.deleteMany({ where: { usuarioId: id } });
    await tx.permissaoDelegada.deleteMany({ where: { usuarioId: id } });
  }

  /** Destinatários de e-mail: ativos, não anonimizados e com a opção ligada. */
  async contatosParaEmail(ids: string[]) {
    return this.prisma.usuario.findMany({
      where: { id: { in: ids }, ativo: true, anonimizadoEm: null, notificacoesPorEmail: true },
      select: { id: true, nome: true, email: true },
    });
  }

  async profissionalPorEmail(email: string) {
    return this.prisma.usuario.findFirst({
      where: { email: email.trim().toLowerCase(), ativo: true, papel: { not: 'ALUNO' } },
      select: { id: true, papel: true },
    });
  }

  /** LGPD — correção pedida pelo titular (nome e/ou matrícula). */
  async corrigirDados(id: string, d: { nome?: string; matricula?: string }, tx: Prisma.TransactionClient) {
    if (d.matricula) {
      const outro = await tx.usuario.findFirst({ where: { matricula: d.matricula, NOT: { id } } });
      if (outro) throw new ConflictException('Esta matrícula já pertence a outra pessoa');
    }
    await tx.usuario.update({
      where: { id },
      data: { ...(d.nome ? { nome: d.nome } : {}), ...(d.matricula ? { matricula: d.matricula } : {}) },
    });
  }

  async alunosAtivos(ids: string[]) {
    return this.prisma.usuario.findMany({
      where: { id: { in: ids }, papel: 'ALUNO', ativo: true, anonimizadoEm: null },
      select: { id: true },
    });
  }

  async possiveisCorretores() {
    return this.prisma.usuario.findMany({
      where: { ativo: true, papel: { in: ['CORRETOR', 'PROFESSOR', 'COORDENADOR'] }, anonimizadoEm: null },
      select: { id: true, nome: true, email: true, papel: true },
      orderBy: { nome: 'asc' },
    });
  }

  async professoresAtivos() {
    return this.prisma.usuario.findMany({
      where: { ativo: true, papel: { in: ['PROFESSOR', 'COORDENADOR', 'ADMINISTRADOR'] }, anonimizadoEm: null },
      select: { id: true, nome: true, email: true, papel: true },
      orderBy: { nome: 'asc' },
    });
  }

  async mfaHabilitado(id: string): Promise<boolean> {
    return !!(await this.prisma.usuario.findUnique({ where: { id }, select: { mfaHabilitado: true } }))?.mfaHabilitado;
  }

  /** Coordenação e administração ativas (destinatários de encaminhamentos). */
  async idsGestoresAtivos(): Promise<string[]> {
    const gestores = await this.prisma.usuario.findMany({
      where: { papel: { in: ['ADMINISTRADOR', 'COORDENADOR'] }, ativo: true },
      select: { id: true },
    });
    return gestores.map((g) => g.id);
  }

  async idsAdministradoresAtivos(): Promise<string[]> {
    const admins = await this.prisma.usuario.findMany({
      where: { papel: 'ADMINISTRADOR', ativo: true },
      select: { id: true },
    });
    return admins.map((a) => a.id);
  }

  /** Dados cadastrais e sessões do titular (exportação LGPD). */
  async dadosDoTitular(id: string) {
    const u = await this.buscar(id);
    const sessoes = await this.prisma.sessao.findMany({
      where: { usuarioId: id },
      select: { ambiente: true, criadoEm: true, ultimoUsoEm: true, revogadaEm: true, ip: true, userAgent: true },
      orderBy: { criadoEm: 'desc' },
      take: 200,
    });
    return {
      cadastro: {
        id: u.id,
        nome: u.nome,
        email: u.email,
        matricula: u.matricula,
        papel: u.papel,
        ativo: u.ativo,
        mfaHabilitado: u.mfaHabilitado,
        criadoEm: u.criadoEm,
        ultimoLoginEm: u.ultimoLoginEm,
      },
      sessoes,
    };
  }

  private async buscar(id: string): Promise<Usuario> {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    return u;
  }

  /** Mapa id → resumo (nome, e-mail, matrícula) para exibição em outros módulos. */
  async resumos(ids: string[]): Promise<Map<string, ResumoUsuario>> {
    const unicos = [...new Set(ids)];
    if (unicos.length === 0) return new Map();
    const usuarios = await this.prisma.usuario.findMany({
      where: { id: { in: unicos } },
      select: SELECAO_RESUMO,
    });
    return new Map(usuarios.map((u) => [u.id, u]));
  }

  async obterProfissional(id: string) {
    return this.prisma.usuario.findFirst({
      where: { id, ativo: true, papel: { not: 'ALUNO' } },
      select: { ...SELECAO_RESUMO, papel: true },
    });
  }

  /**
   * Localiza um aluno por e-mail (ou matrícula) ou cria um novo com senha temporária.
   * Usado na matrícula individual e na importação CSV (RF03).
   * Lança BadRequest/Conflict com mensagem amigável quando os dados conflitam.
   */
  async localizarOuCriarAluno(
    dados: DadosAluno,
    autorId: string,
  ): Promise<ResultadoAluno> {
    const email = dados.email.trim().toLowerCase();
    const matricula = dados.matricula?.trim() || null;

    const porEmail = await this.prisma.usuario.findUnique({ where: { email } });
    if (porEmail) {
      if (porEmail.papel !== 'ALUNO') {
        // Não revela o papel de quem já usa o e-mail (BUG-051).
        throw new BadRequestException(
          `O e-mail ${email} já está em uso por outra conta — procure a secretaria`,
        );
      }
      if (matricula && porEmail.matricula && porEmail.matricula !== matricula) {
        throw new ConflictException(
          `O aluno ${email} já possui outra matrícula cadastrada — confira a planilha`,
        );
      }
      return {
        situacao: 'EXISTENTE',
        aluno: {
          id: porEmail.id,
          nome: porEmail.nome,
          email: porEmail.email,
          matricula: porEmail.matricula,
        },
      };
    }

    if (matricula) {
      const porMatricula = await this.prisma.usuario.findUnique({
        where: { matricula },
      });
      if (porMatricula) {
        // Não revela o e-mail de quem já tem a matrícula (BUG-051).
        throw new ConflictException(
          `A matrícula ${matricula} já está em uso por outra conta`,
        );
      }
    }

    const { usuario, senhaTemporaria, conviteEnviado } = await this.criar(
      { nome: dados.nome.trim(), email, matricula: matricula ?? undefined, papel: 'ALUNO' },
      autorId,
    );
    return {
      situacao: 'CRIADO',
      aluno: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        matricula: usuario.matricula,
      },
      senhaTemporaria,
      conviteEnviado,
    };
  }
}
