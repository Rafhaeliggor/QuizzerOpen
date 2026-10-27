import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import type { Env } from '../../config/env.js';
import type { StatusSolicitacaoLgpd } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { ExecucaoService } from '../aplicacao/execucao.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { CorrecaoService } from '../correcao/correcao.service.js';
import { SessaoService } from '../iam/sessao.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { RecursosService } from '../recursos/recursos.service.js';
import { TurmasService } from '../turmas/turmas.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

/**
 * LGPD (RNF05): acesso aos próprios dados (art. 18, II) e eliminação/anonimização
 * (art. 18, IV e VI). Ver ADR-0028.
 *
 * Anonimização ≠ apagar tudo: notas, tentativas e recursos são registros acadêmicos que a
 * instituição precisa manter (art. 16, I — obrigação legal/regulatória). Eles permanecem,
 * mas sem nome, e-mail ou matrícula; o id restante aponta para uma conta sem dados pessoais.
 */
@Injectable()
export class LgpdService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LgpdService.name);
  private agendamento?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usuarios: UsuariosService,
    private readonly sessoes: SessaoService,
    private readonly turmas: TurmasService,
    private readonly correcao: CorrecaoService,
    private readonly recursos: RecursosService,
    private readonly execucao: ExecucaoService,
    private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test' || !this.config.get('RETENCAO_EXTERNOS_DIAS', { infer: true })) return;
    const rodar = () =>
      this.aplicarRetencao().catch((erro: unknown) => this.logger.error({ erro: String(erro) }, 'Falha na retenção de externos'));
    setTimeout(rodar, 5 * 60_000).unref();
    this.agendamento = setInterval(rodar, 24 * 3600_000);
    this.agendamento.unref();
  }

  onModuleDestroy() {
    if (this.agendamento) clearInterval(this.agendamento);
  }

  // ---------------------------------------------------------------- titular

  /** Tudo o que o sistema guarda sobre o titular, em JSON legível. */
  async exportar(u: UsuarioAutenticado) {
    const [titular, resultados, recursos, notificacoes, solicitacoes, turmaIds] = await Promise.all([
      this.usuarios.dadosDoTitular(u.id),
      this.correcao.resultadosDoAluno(u.id),
      this.recursos.doAluno(u.id),
      this.notificacoes.listar(u.id),
      this.minhas(u.id),
      this.turmas.turmasAtivasDoAluno(u.id),
    ]);
    const nomesTurmas = await this.turmas.nomes(turmaIds);
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'LGPD_DADOS_EXPORTADOS', recurso: 'usuario', recursoId: u.id });
    return {
      geradoEm: new Date(),
      observacao:
        'Exportação dos seus dados pessoais no Quizzer (LGPD, art. 18). Registros de auditoria ' +
        'guardam apenas o identificador da sua conta e o IP de acesso, por obrigação de segurança.',
      ...titular,
      turmasAtivas: turmaIds.map((id) => ({ id, nome: nomesTurmas.get(id) ?? '' })),
      resultados,
      recursos: recursos.map((r) => ({
        prova: r.provaTitulo,
        questao: r.questaoOrdem,
        justificativa: r.justificativa,
        status: r.status,
        decisao: r.decisao,
        criadoEm: r.criadoEm,
      })),
      notificacoes: notificacoes.itens,
      solicitacoesLgpd: solicitacoes,
    };
  }

  async solicitar(
    u: UsuarioAutenticado,
    justificativa?: string,
    tipo: 'EXCLUSAO' | 'CORRECAO' = 'EXCLUSAO',
    correcao?: { nome?: string; matricula?: string },
  ) {
    const pendente = await this.prisma.solicitacaoLgpd.findFirst({ where: { usuarioId: u.id, status: 'PENDENTE' } });
    if (pendente) throw new ConflictException('Você já tem uma solicitação em análise');
    let dados: Record<string, string> | null = null;
    if (tipo === 'CORRECAO') {
      dados = Object.fromEntries(
        Object.entries(correcao ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1].trim() !== ''),
      );
      if (Object.keys(dados).length === 0) throw new BadRequestException('Informe o dado correto (nome ou matrícula)');
    }
    const s = await this.prisma.solicitacaoLgpd.create({
      data: {
        usuarioId: u.id,
        tipo,
        justificativa: justificativa?.trim() || null,
        ...(dados ? { dadosCorrigidos: dados } : {}),
      },
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: tipo === 'CORRECAO' ? 'LGPD_CORRECAO_SOLICITADA' : 'LGPD_EXCLUSAO_SOLICITADA',
      recurso: 'solicitacao_lgpd',
      recursoId: s.id,
      // Sem os valores novos: a auditoria não guarda dado pessoal (ADR-0028).
      ...(dados ? { dados: { campos: Object.keys(dados) } } : {}),
    });
    await this.notificacoes.notificar(await this.usuarios.idsAdministradoresAtivos(), {
      tipo: 'LGPD_SOLICITACAO',
      titulo: tipo === 'CORRECAO' ? 'Pedido de correção de dados (LGPD)' : 'Nova solicitação de exclusão de dados (LGPD)',
      mensagem: `Um titular pediu a ${tipo === 'CORRECAO' ? 'correção' : 'exclusão'} de dados pessoais. Prazo legal de resposta: 15 dias.`,
      link: '/app/lgpd',
    });
    return s;
  }

  /** Atende um pedido de CORREÇÃO: aplica nome/matrícula na conta e nos resultados guardados. */
  async corrigir(admin: UsuarioAutenticado, id: string, resposta?: string) {
    const s = await this.buscarPendente(id);
    if (s.tipo !== 'CORRECAO') throw new BadRequestException('Esta solicitação não é de correção');
    const dados = (s.dadosCorrigidos ?? {}) as { nome?: string; matricula?: string };
    await this.prisma.$transaction(async (tx) => {
      await this.usuarios.corrigirDados(s.usuarioId, dados, tx);
      if (dados.nome) await this.correcao.corrigirNomeParticipante(s.usuarioId, dados.nome, tx);
      await tx.solicitacaoLgpd.update({
        where: { id },
        data: { status: 'CONCLUIDA', resposta: resposta?.trim() || 'Dados corrigidos.', atendidoPorId: admin.id, concluidaEm: new Date() },
      });
    });
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'LGPD_DADOS_CORRIGIDOS',
      recurso: 'usuario',
      recursoId: s.usuarioId,
      dados: { campos: Object.keys(dados) },
    });
    return { id, status: 'CONCLUIDA' };
  }

  /** Retenção de externos (lote 8): anonimiza o que passou de RETENCAO_EXTERNOS_DIAS. */
  async aplicarRetencao(agora = new Date(), dias = this.config.get('RETENCAO_EXTERNOS_DIAS', { infer: true })) {
    if (!dias) return { ligada: false, dias: 0, notas: 0, instancias: 0 };
    const limite = new Date(agora.getTime() - dias * 86_400_000);
    const r = await this.prisma.$transaction(async (tx) => ({
      notas: await this.correcao.anonimizarExternosAntigos(limite, tx),
      instancias: await this.execucao.anonimizarExternosAntigos(limite, tx),
    }));
    if (r.notas || r.instancias) {
      await this.auditoria.registrar({ usuarioId: null, acao: 'LGPD_RETENCAO_EXTERNOS', recurso: 'participante_externo', dados: { dias, ...r } });
    }
    return { ligada: true, dias, ...r };
  }

  minhas(usuarioId: string) {
    return this.prisma.solicitacaoLgpd.findMany({
      where: { usuarioId },
      orderBy: { criadoEm: 'desc' },
      select: { id: true, status: true, justificativa: true, resposta: true, criadoEm: true, concluidaEm: true },
    });
  }

  // ---------------------------------------------------------------- administrador

  async listar(status?: StatusSolicitacaoLgpd) {
    const itens = await this.prisma.solicitacaoLgpd.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: 'asc' }, { criadoEm: 'asc' }],
      include: { usuario: { select: { nome: true, email: true, papel: true, anonimizadoEm: true } } },
      take: 500,
    });
    return itens.map(({ usuario, ...s }) => ({
      ...s,
      titularNome: usuario.nome,
      titularEmail: usuario.email,
      titularPapel: usuario.papel,
      // Prazo de 15 dias para resposta (art. 19, II).
      prazoResposta: new Date(s.criadoEm.getTime() + 15 * 24 * 3600_000),
    }));
  }

  /** Executa a anonimização pedida pelo titular. Irreversível. */
  async concluir(admin: UsuarioAutenticado, id: string, resposta?: string) {
    const s = await this.buscarPendente(id);
    if (s.tipo === 'CORRECAO') return this.corrigir(admin, id, resposta);
    if (s.usuarioId === admin.id) {
      throw new BadRequestException('Outro administrador deve atender a sua própria solicitação');
    }
    const titular = await this.prisma.usuario.findUniqueOrThrow({ where: { id: s.usuarioId } });
    if (titular.papel === 'ADMINISTRADOR') {
      const admins = await this.usuarios.idsAdministradoresAtivos();
      if (admins.filter((a) => a !== titular.id).length === 0) {
        throw new ConflictException('Não é possível anonimizar o último administrador ativo');
      }
    }

    const resumo = await this.prisma.$transaction(async (tx) => {
      const notas = await this.correcao.anonimizarParticipante({ usuarioId: titular.id }, tx);
      const vinculos = await this.turmas.desvincularTodas(titular.id, tx);
      const notificacoes = await this.notificacoes.excluirDoUsuario(titular.id, tx);
      await this.usuarios.anonimizar(titular.id, tx);
      await tx.solicitacaoLgpd.update({
        where: { id },
        data: {
          status: 'CONCLUIDA',
          resposta: resposta?.trim() || 'Dados pessoais anonimizados.',
          atendidoPorId: admin.id,
          concluidaEm: new Date(),
        },
      });
      return { notas, vinculos, notificacoes };
    });
    await this.sessoes.revogarTodas(titular.id); // limpa o cache de sessões ativas

    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'LGPD_TITULAR_ANONIMIZADO',
      recurso: 'usuario',
      recursoId: titular.id,
      dados: resumo,
    });
    return { id, status: 'CONCLUIDA', ...resumo };
  }

  async recusar(admin: UsuarioAutenticado, id: string, resposta: string) {
    await this.buscarPendente(id);
    await this.prisma.solicitacaoLgpd.update({
      where: { id },
      data: { status: 'RECUSADA', resposta, atendidoPorId: admin.id, concluidaEm: new Date() },
    });
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'LGPD_SOLICITACAO_RECUSADA',
      recurso: 'solicitacao_lgpd',
      recursoId: id,
      justificativa: resposta,
    });
    return { id, status: 'RECUSADA' };
  }

  /**
   * Participante externo de prova pública (sem conta) pede exclusão por outro canal
   * (e-mail à instituição): o administrador anonimiza pelo e-mail informado.
   */
  async anonimizarExterno(admin: UsuarioAutenticado, email: string, justificativa: string) {
    const alvo = email.trim().toLowerCase();
    const resumo = await this.prisma.$transaction(async (tx) => ({
      notas: await this.correcao.anonimizarParticipante({ email: alvo }, tx),
      instancias: await this.execucao.anonimizarExterno(alvo, tx),
    }));
    if (resumo.notas === 0 && resumo.instancias === 0) {
      throw new NotFoundException('Nenhum registro de participante externo com este e-mail');
    }
    // O e-mail NÃO vai para a auditoria (seria guardar o dado que acabamos de apagar).
    await this.auditoria.registrar({
      usuarioId: admin.id,
      acao: 'LGPD_EXTERNO_ANONIMIZADO',
      recurso: 'participante_externo',
      justificativa,
      dados: resumo,
    });
    return resumo;
  }

  private async buscarPendente(id: string) {
    const s = await this.prisma.solicitacaoLgpd.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Solicitação não encontrada');
    if (s.status !== 'PENDENTE') throw new ConflictException('Solicitação já atendida');
    return s;
  }
}
