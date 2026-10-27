import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { StatusTentativa } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { CorrecaoService } from '../correcao/correcao.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { ProvasService } from '../provas/provas.service.js';
import { RecursosService } from '../recursos/recursos.service.js';
import { TurmasService } from '../turmas/turmas.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { CriarAplicacaoDto } from './dto.js';
import { ExecucaoService } from './execucao.service.js';
import { gerarPin } from './instancia.js';
import { formatarDataHora } from '../../common/fuso/fuso.js';

const EM_ANDAMENTO: StatusTentativa[] = ['EM_ANDAMENTO', 'REABERTA'];

function situacaoJanela(a: { janelaInicio: Date; janelaFim: Date }, agora = new Date()) {
  return agora < a.janelaInicio ? 'AGENDADA' : agora > a.janelaFim ? 'ENCERRADA' : 'DISPONIVEL';
}

/** Direcionamento de provas publicadas (turma ou pública por PIN) e acompanhamento. */
@Injectable()
export class AplicacoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provas: ProvasService,
    private readonly turmas: TurmasService,
    private readonly usuarios: UsuariosService,
    private readonly correcao: CorrecaoService,
    private readonly recursos: RecursosService,
    private readonly execucao: ExecucaoService,
    private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------------------------------------------------------------- profissional

  async criar(u: UsuarioAutenticado, dto: CriarAplicacaoDto) {
    const prova = await this.provas.obterVisivel(u, dto.provaId);
    if (prova.status !== 'PUBLICADA') throw new BadRequestException('Só provas publicadas podem ser aplicadas');

    const inicio = new Date(dto.janelaInicio);
    const fim = new Date(dto.janelaFim);
    if (fim <= inicio) throw new BadRequestException('O fim da janela deve ser depois do início');
    if (fim <= new Date()) throw new BadRequestException('O fim da janela já passou');

    let turmaId: string | null = null;
    let alunoIds: string[] = [];
    if (dto.destinoTipo === 'TURMA') {
      if (!dto.turmaId) throw new BadRequestException('Escolha a turma');
      turmaId = (await this.turmas.obterVisivel(u, dto.turmaId)).id;
    } else if (dto.destinoTipo === 'ALUNO_AVULSO') {
      alunoIds = [...new Set(dto.alunoIds ?? [])];
      const alunos = await this.usuarios.alunosAtivos(alunoIds);
      if (alunos.length !== alunoIds.length) throw new BadRequestException('Algum aluno escolhido não existe ou está inativo');
      // Professor só aplica a alunos das turmas que vê (gestão: qualquer aluno).
      const visiveis = await this.turmas.alunosVisiveis(u, alunoIds);
      if (visiveis.size !== alunoIds.length) throw new BadRequestException('Escolha apenas alunos das suas turmas');
    } else if (prova.visibilidade !== 'PUBLICA') {
      throw new BadRequestException('Só provas com visibilidade pública podem ser aplicadas por PIN/link');
    }

    let aplicacao;
    for (let tentativa = 0; ; tentativa++) {
      try {
        aplicacao = await this.prisma.aplicacao.create({
          data: {
            provaId: prova.id,
            turmaId,
            destinoTipo: dto.destinoTipo,
            janelaInicio: inicio,
            janelaFim: fim,
            pinAcesso: dto.destinoTipo === 'PUBLICO' ? gerarPin() : null,
            criadoPorId: u.id,
            ...(alunoIds.length ? { alunos: { create: alunoIds.map((alunoId) => ({ alunoId })) } } : {}),
          },
        });
        break;
      } catch (erro) {
        const colisaoPin = erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002';
        if (!colisaoPin || tentativa >= 5) throw erro;
      }
    }

    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'APLICACAO_CRIADA',
      recurso: 'aplicacao',
      recursoId: aplicacao.id,
      dados: { provaId: prova.id, destino: dto.destinoTipo, turmaId, alunos: alunoIds.length || undefined },
    });
    if (turmaId || alunoIds.length) {
      await this.notificacoes.notificar(turmaId ? await this.turmas.alunosAtivos(turmaId) : alunoIds, {
        tipo: 'PROVA_DISPONIVEL',
        titulo: 'Nova prova disponível',
        mensagem: `"${prova.titulo}" — disponível de ${formatar(inicio)} até ${formatar(fim)}.`,
        link: '/aluno',
      });
    }
    return aplicacao;
  }

  async listar(u: UsuarioAutenticado, provaId?: string) {
    const ids = await this.provas.idsVisiveis(u);
    const aplicacoes = await this.prisma.aplicacao.findMany({
      where: {
        ...(ids === null ? {} : { provaId: { in: ids } }),
        ...(provaId ? { provaId } : {}),
      },
      orderBy: { janelaInicio: 'desc' },
      include: {
        instancias: { select: { tentativas: { select: { status: true } } } },
        _count: { select: { alunos: true } },
      },
    });
    const [provas, turmas] = await Promise.all([
      this.provas.resumos(aplicacoes.map((a) => a.provaId)),
      this.turmas.nomes(aplicacoes.map((a) => a.turmaId).filter((x): x is string => !!x)),
    ]);
    return aplicacoes.map(({ instancias, _count, ...a }) => {
      const tentativas = instancias.flatMap((i) => i.tentativas);
      return {
        ...a,
        provaTitulo: provas.get(a.provaId)?.titulo ?? '—',
        turmaNome: a.turmaId ? (turmas.get(a.turmaId) ?? '—') : null,
        alunosSelecionados: _count.alunos,
        situacao: situacaoJanela(a),
        participantes: instancias.length,
        emAndamento: tentativas.filter((t) => EM_ANDAMENTO.includes(t.status)).length,
        finalizadas: tentativas.filter((t) => !EM_ANDAMENTO.includes(t.status)).length,
      };
    });
  }

  /** Acompanhamento: participantes, status das tentativas e notas. */
  async obter(u: UsuarioAutenticado, id: string) {
    const a = await this.buscarVisivel(u, id);
    const prova = await this.provas.obterVisivel(u, a.provaId);
    const instancias = await this.prisma.instancia.findMany({
      where: { aplicacaoId: id },
      include: { tentativas: { orderBy: { numero: 'asc' } } },
    });
    const notas = await this.correcao.resultadosDasTentativas(
      instancias.flatMap((i) => i.tentativas.map((t) => t.id)),
    );

    // Turma ou alunos escolhidos: lista todos os destinatários, inclusive quem ainda não começou.
    const alunosTurma = a.turmaId
      ? await this.turmas.alunosAtivos(a.turmaId)
      : (await this.prisma.aplicacaoAluno.findMany({ where: { aplicacaoId: id }, select: { alunoId: true } })).map((x) => x.alunoId);
    const pessoas = await this.usuarios.resumos([
      ...alunosTurma,
      ...instancias.map((i) => i.participanteId).filter((x): x is string => !!x),
    ]);
    const porChave = new Map(instancias.map((i) => [i.participanteChave, i]));
    const chaves = new Set([...alunosTurma.map((x) => `u:${x}`), ...instancias.map((i) => i.participanteChave)]);

    const participantes = [...chaves].map((chave) => {
      const inst = porChave.get(chave);
      const usuarioId = chave.startsWith('u:') ? chave.slice(2) : null;
      const pessoa = usuarioId ? pessoas.get(usuarioId) : null;
      const ident = inst?.identificacaoMinima as { nome?: string; email?: string } | null;
      return {
        chave,
        usuarioId,
        nome: pessoa?.nome ?? ident?.nome ?? '—',
        email: pessoa?.email ?? ident?.email ?? '',
        matriculaAtiva: usuarioId ? alunosTurma.includes(usuarioId) : null,
        tentativas: (inst?.tentativas ?? []).map((t) => {
          const n = notas.get(t.id);
          return {
            id: t.id,
            numero: t.numero,
            status: t.status,
            inicioEm: t.inicioEm,
            prazoEm: t.prazoEm,
            fimEm: t.fimEm,
            trocasSessao: t.trocasSessao,
            saidasDeFoco: t.saidasDeFoco,
            nota: n
              ? { id: n.id, status: n.status, notaFinal: n.notaFinal, notaProvisoria: n.notaProvisoria, statusAprovacao: n.statusAprovacao }
              : null,
          };
        }),
      };
    });
    participantes.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));

    return {
      ...a,
      provaTitulo: prova.titulo,
      provaTentativasPermitidas: prova.tentativasPermitidas,
      turmaNome: a.turmaId ? ((await this.turmas.nomes([a.turmaId])).get(a.turmaId) ?? '—') : null,
      situacao: situacaoJanela(a),
      participantes,
    };
  }

  /** Linha do tempo de comportamento de uma tentativa (saídas/voltas da aba da prova). */
  async eventos(u: UsuarioAutenticado, tentativaId: string) {
    const t = await this.prisma.tentativa.findUnique({ where: { id: tentativaId }, include: { instancia: true } });
    if (!t) throw new NotFoundException('Tentativa não encontrada');
    await this.buscarVisivel(u, t.instancia.aplicacaoId);
    const eventos = await this.prisma.eventoTentativa.findMany({
      where: { tentativaId },
      orderBy: { ocorridoEm: 'asc' },
      select: { tipo: true, ocorridoEm: true },
    });
    return { tentativaId, inicioEm: t.inicioEm, fimEm: t.fimEm, saidasDeFoco: t.saidasDeFoco, trocasSessao: t.trocasSessao, eventos };
  }

  /** Encerra a janela agora e envia automaticamente as tentativas em andamento. */
  async encerrar(u: UsuarioAutenticado, id: string) {
    const a = await this.buscarVisivel(u, id);
    const agora = new Date();
    if (a.janelaFim > agora) {
      await this.prisma.aplicacao.update({ where: { id }, data: { janelaFim: agora } });
    }
    const abertas = await this.prisma.tentativa.findMany({
      where: { instancia: { aplicacaoId: id }, status: { in: EM_ANDAMENTO } },
      select: { id: true },
    });
    for (const t of abertas) {
      await this.prisma.tentativa.update({ where: { id: t.id }, data: { prazoEm: agora } });
      await this.execucao.finalizar(t.id, 'EXPIRADA');
    }
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'APLICACAO_ENCERRADA',
      recurso: 'aplicacao',
      recursoId: id,
      dados: { tentativasEncerradas: abertas.length },
    });
    return this.obter(u, id);
  }

  /**
   * RNF03 / RN-40: reabertura só por ação administrativa explícita, com justificativa.
   * O resultado anterior é descartado e recalculado no novo envio.
   */
  async reabrir(u: UsuarioAutenticado, tentativaId: string, justificativa: string, minutos: number) {
    const t = await this.prisma.tentativa.findUnique({
      where: { id: tentativaId },
      include: { instancia: true },
    });
    if (!t) throw new NotFoundException('Tentativa não encontrada');
    await this.buscarVisivel(u, t.instancia.aplicacaoId);
    if (EM_ANDAMENTO.includes(t.status)) throw new ConflictException('A tentativa ainda está em andamento');
    if (t.status === 'INVALIDADA') throw new ConflictException('Tentativa invalidada não pode ser reaberta');

    const nota = await this.correcao.resultadoDaTentativa(tentativaId);
    if (nota && (await this.recursos.existeParaNota(nota.id))) {
      throw new ConflictException('Tentativa com recurso registrado não pode ser reaberta');
    }

    const prazoEm = new Date(Date.now() + minutos * 60_000);
    await this.prisma.$transaction(async (tx) => {
      await this.correcao.descartarResultado(tentativaId, tx);
      await tx.tentativa.update({
        where: { id: tentativaId },
        data: { status: 'REABERTA', prazoEm, fimEm: null, comprovanteCodigo: null, sessaoExecucao: null },
      });
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'TENTATIVA_REABERTA',
      recurso: 'tentativa',
      recursoId: tentativaId,
      justificativa,
      dados: { minutos, statusAnterior: t.status },
    });
    await this.notificacoes.notificar([t.instancia.participanteId], {
      tipo: 'PROVA_DISPONIVEL',
      titulo: 'Prova reaberta',
      mensagem: `Sua tentativa foi reaberta por ${minutos} minutos. Motivo: ${justificativa}`,
      link: '/aluno',
    });
    return { id: tentativaId, status: 'REABERTA', prazoEm };
  }

  // ---------------------------------------------------------------- aluno

  /** Provas direcionadas às turmas do aluno, com a situação de cada uma. */
  async doAluno(alunoId: string) {
    const turmaIds = await this.turmas.turmasAtivasDoAluno(alunoId);
    const aplicacoes = await this.prisma.aplicacao.findMany({
      where: {
        OR: [
          { destinoTipo: 'TURMA', turmaId: { in: turmaIds } },
          { destinoTipo: 'ALUNO_AVULSO', alunos: { some: { alunoId } } },
        ],
      },
      orderBy: { janelaFim: 'asc' },
      include: {
        instancias: {
          where: { participanteChave: `u:${alunoId}` },
          include: { tentativas: { orderBy: { numero: 'asc' } } },
        },
      },
    });
    const [provas, turmas] = await Promise.all([
      this.provas.resumos(aplicacoes.map((a) => a.provaId)),
      this.turmas.nomes(turmaIds),
    ]);
    const agora = new Date();
    return aplicacoes.map((a) => {
      const prova = provas.get(a.provaId);
      const tentativas = a.instancias[0]?.tentativas ?? [];
      const emAndamento = tentativas.find((t) => EM_ANDAMENTO.includes(t.status) && t.prazoEm > agora);
      const situacao = situacaoJanela(a, agora);
      const restantes = (prova?.tentativasPermitidas ?? 1) - tentativas.length;
      return {
        aplicacaoId: a.id,
        provaTitulo: prova?.titulo ?? '—',
        provaDescricao: prova?.descricao ?? null,
        turmaNome: a.turmaId ? (turmas.get(a.turmaId) ?? '') : 'Aplicação individual',
        tempoLimiteMin: prova?.tempoLimiteMin ?? null,
        totalQuestoes: prova?.totalQuestoes ?? 0,
        janelaInicio: a.janelaInicio,
        janelaFim: a.janelaFim,
        situacao,
        tentativasPermitidas: prova?.tentativasPermitidas ?? 1,
        tentativasUsadas: tentativas.length,
        tentativaEmAndamentoId: emAndamento?.id ?? null,
        ultimaTentativaId: tentativas.at(-1)?.id ?? null,
        podeIniciar: situacao === 'DISPONIVEL' && (!!emAndamento || restantes > 0),
      };
    });
  }

  // ---------------------------------------------------------------- apoio

  private async buscarVisivel(u: UsuarioAutenticado, id: string) {
    const a = await this.prisma.aplicacao.findUnique({ where: { id } });
    const ids = await this.provas.idsVisiveis(u);
    if (!a || (ids !== null && !ids.includes(a.provaId))) {
      throw new NotFoundException('Aplicação não encontrada');
    }
    return a;
  }
}

const formatar = (d: Date) => formatarDataHora(d);
