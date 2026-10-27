import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ehGestor } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { NotificacoesService } from '../notificacoes/notificacoes.service.js';
import { ProvasService, type CriterioAprovacao } from '../provas/provas.service.js';
import {
  calcularNota,
  corrigirAutomaticamente,
  gabaritoVisivel,
  prazoRecursoFim,
  type Politica,
  type SecaoParaCalculo,
} from './calculo.js';
import { acaoPendente, decidirDupla } from './dupla.js';

type Tx = Prisma.TransactionClient;

/** Dados que a aplicação entrega ao finalizar uma tentativa (snapshot completo). */
export interface TentativaParaCorrecao {
  tentativaId: string;
  aplicacaoId: string;
  provaId: string;
  turmaId: string | null;
  usuarioId: string | null;
  provaTitulo: string;
  participanteNome: string;
  participanteEmail: string;
  tentativaNumero: number;
  certificado: boolean;
  criterioAprovacao: CriterioAprovacao;
  inicioEm: Date;
  fimEm: Date;
  /** Snapshot das políticas da prova (RF07/RF08). */
  exibirGabarito: string;
  /** Seções com nota mínima e correção às cegas (lote 8). */
  secoes?: { id: string; titulo: string; notaMinima: number | null }[];
  correcaoAsCegas?: boolean;
  correcaoDupla?: boolean;
  limiarDivergencia?: number;
  janelaFim: Date | null;
  prazoRecursoDias: number | null;
  itens: {
    versaoQuestaoId: string;
    ordem: number;
    natureza: 'FECHADA' | 'ABERTA';
    formato: string;
    disciplina: string;
    secaoId?: string | null;
    peso: number;
    enunciado: string;
    alternativas: unknown;
    gabarito: unknown;
    rubrica: unknown;
    midias?: unknown;
    resposta: unknown;
  }[];
}

const json = (v: unknown) => (v == null ? Prisma.DbNull : (v as Prisma.InputJsonValue));

/** RF07 — Correção automática/manual e consolidação de nota. */
@Injectable()
export class CorrecaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provas: ProvasService,
    private readonly notificacoes: NotificacoesService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ------------------------------------------------- chamado pela aplicação

  /**
   * Passos 1–4 do RF07, dentro da mesma transação que finalizou a tentativa.
   * Idempotente: se a nota já existe, nada é refeito.
   */
  async registrarTentativa(d: TentativaParaCorrecao, tx: Tx) {
    const existente = await tx.nota.findUnique({ where: { tentativaId: d.tentativaId } });
    if (existente) return { notaId: existente.id, consolidou: false };

    const agora = new Date();
    const nota = await tx.nota.create({
      data: {
        tentativaId: d.tentativaId,
        aplicacaoId: d.aplicacaoId,
        provaId: d.provaId,
        turmaId: d.turmaId,
        usuarioId: d.usuarioId,
        provaTitulo: d.provaTitulo,
        participanteNome: d.participanteNome,
        participanteEmail: d.participanteEmail,
        tentativaNumero: d.tentativaNumero,
        certificado: d.certificado,
        criterioAprovacao: d.criterioAprovacao as unknown as Prisma.InputJsonValue,
        inicioEm: d.inicioEm,
        fimEm: d.fimEm,
        exibirGabarito: d.exibirGabarito,
        janelaFim: d.janelaFim,
        prazoRecursoDias: d.prazoRecursoDias,
        secoes: d.secoes?.length ? (d.secoes as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        correcaoAsCegas: d.correcaoAsCegas ?? false,
        correcaoDupla: d.correcaoDupla ?? false,
        limiarDivergencia: d.limiarDivergencia ?? 20,
        questoes: {
          create: d.itens.map((i) => {
            const fracao = corrigirAutomaticamente(i.formato, i.resposta, i.gabarito);
            const automatica = fracao !== null;
            return {
              versaoQuestaoId: i.versaoQuestaoId,
              ordem: i.ordem,
              natureza: i.natureza,
              formato: i.formato,
              disciplina: i.disciplina,
              secaoId: i.secaoId ?? null,
              peso: i.peso,
              enunciado: i.enunciado,
              alternativas: json(i.alternativas),
              gabarito: json(i.gabarito),
              rubrica: json(i.rubrica),
              midias: json(Array.isArray(i.midias) && i.midias.length ? i.midias : null),
              resposta: json(i.resposta),
              fracao,
              automatica,
              feedback: automatica && i.natureza === 'ABERTA' ? 'Questão sem resposta.' : null,
              corrigidoEm: automatica ? agora : null,
            };
          }),
        },
      },
    });
    const consolidou = await this.recalcular(nota.id, tx);
    return { notaId: nota.id, consolidou };
  }

  /** Notifica o aluno quando o resultado é publicado (chamar após o commit). */
  async notificarResultado(notaId: string) {
    const nota = await this.prisma.nota.findUnique({ where: { id: notaId } });
    if (!nota?.usuarioId || nota.status !== 'CONSOLIDADA') return;
    await this.notificacoes.notificar([nota.usuarioId], {
      tipo: 'RESULTADO_PUBLICADO',
      titulo: 'Resultado publicado',
      mensagem: `Sua nota em "${nota.provaTitulo}" está disponível.`,
      link: `/aluno/resultados/${nota.id}`,
    });
  }

  /** Reabertura administrativa: descarta o resultado para ser recalculado no novo envio. */
  async descartarResultado(tentativaId: string, tx: Tx) {
    const nota = await tx.nota.findUnique({ where: { tentativaId } });
    if (!nota) return;
    await tx.nota.delete({ where: { id: nota.id } });
  }

  async resultadoDaTentativa(tentativaId: string) {
    return this.prisma.nota.findUnique({
      where: { tentativaId },
      select: { id: true, status: true, notaFinal: true, notaProvisoria: true, statusAprovacao: true, certificado: true },
    });
  }

  async resultadosDasTentativas(tentativaIds: string[]) {
    const notas = await this.prisma.nota.findMany({
      where: { tentativaId: { in: tentativaIds } },
      select: { id: true, tentativaId: true, status: true, notaFinal: true, notaProvisoria: true, statusAprovacao: true },
    });
    return new Map(notas.map((n) => [n.tentativaId, n]));
  }

  // ------------------------------------------------- correção manual

  /** Fila: tentativas com questão aberta aguardando correção (RF07, passo 5). */
  async pendentes(u: UsuarioAutenticado) {
    const where = await this.whereVisivel(u);
    const notas = await this.prisma.nota.findMany({
      where: { ...where, status: 'PENDENTE_CORRECAO_MANUAL' },
      include: {
        questoes: {
          where: { fracao: null, natureza: 'ABERTA' },
          select: { id: true, aguardaArbitragem: true, avaliacoes: { select: { papel: true, corretorId: true, fracao: true } } },
        },
      },
      orderBy: { fimEm: 'asc' },
      take: 500,
    });
    const arbitraEm = await this.provasQueArbitra(u, notas.map((n) => n.provaId));
    return notas
      .map((n) => ({
        ...n,
        // Dupla correção (lote 9): só conta o que ESTA pessoa ainda pode fazer.
        questoes: n.correcaoDupla
          ? n.questoes.filter((q) =>
              acaoPendente(
                q.avaliacoes.map((a) => ({ ...a, fracao: Number(a.fracao) })),
                u.id,
                arbitraEm.has(n.provaId),
                q.aguardaArbitragem,
              ),
            )
          : n.questoes,
      }))
      .filter((n) => n.questoes.length > 0)
      .map(({ questoes, ...n }) => ({
        aguardaArbitragem: questoes.some((q) => q.aguardaArbitragem),
        notaId: n.id,
        provaId: n.provaId,
        provaTitulo: n.provaTitulo,
        participanteNome: mascarar(n).participanteNome,
        asCegas: mascarar(n).asCegas,
        tentativaNumero: n.tentativaNumero,
        fimEm: n.fimEm,
        questoesPendentes: questoes.length,
      }));
  }

  async listar(u: UsuarioAutenticado, filtro: { provaId?: string; aplicacaoId?: string }) {
    const where = await this.whereVisivel(u);
    const notas = await this.prisma.nota.findMany({
      where: {
        ...where,
        ...(filtro.provaId ? { provaId: filtro.provaId } : {}),
        ...(filtro.aplicacaoId ? { aplicacaoId: filtro.aplicacaoId } : {}),
      },
      orderBy: { fimEm: 'desc' },
      take: 1000,
    });
    return notas.map((n) => ({ ...n, ...mascarar(n), ...semIdentificadores(n) }));
  }

  async obter(u: UsuarioAutenticado, notaId: string) {
    const where = await this.whereVisivel(u);
    const nota = await this.prisma.nota.findFirst({
      where: { ...where, id: notaId },
      include: { questoes: { orderBy: { ordem: 'asc' }, include: { avaliacoes: { orderBy: { criadoEm: 'asc' } } } } },
    });
    if (!nota) throw new NotFoundException('Resultado não encontrado');
    const anulacoes = await this.anulacoesDaProva(nota.provaId);
    const arbitra = (await this.provasQueArbitra(u, [nota.provaId])).has(nota.provaId);
    return {
      ...nota,
      ...mascarar(nota),
      ...semIdentificadores(nota),
      questoes: nota.questoes.map(({ avaliacoes, ...q }) => {
        // Independência da dupla correção: enquanto a questão está aberta, cada corretor vê só a
        // própria avaliação; quem arbitra vê as duas.
        const visiveis = q.fracao != null || arbitra ? avaliacoes : avaliacoes.filter((a) => a.corretorId === u.id);
        return {
          ...q,
          anulacao: anulacoes.get(q.versaoQuestaoId) ?? null,
          avaliacoes: visiveis.map((a) => ({ papel: a.papel, fracao: a.fracao, feedback: a.feedback, avaliacaoItens: a.avaliacaoItens, minha: a.corretorId === u.id })),
          avaliacoesFeitas: avaliacoes.length,
          acaoPendente: nota.correcaoDupla && q.natureza === 'ABERTA' && q.fracao == null
            ? acaoPendente(avaliacoes.map((a) => ({ papel: a.papel, corretorId: a.corretorId, fracao: Number(a.fracao) })), u.id, arbitra, q.aguardaArbitragem)
            : null,
        };
      }),
    };
  }

  /** RF07 passo 5–6: corretor atribui nota (0–100% da questão) e feedback. */
  async corrigir(
    u: UsuarioAutenticado,
    notaId: string,
    versaoQuestaoId: string,
    avaliacao: { percentual?: number; pontosItens?: number[] },
    feedback?: string,
  ) {
    const nota = await this.obter(u, notaId);
    if (nota.status === 'CONSOLIDADA') {
      throw new ConflictException('Resultado já consolidado — alterações só por recurso');
    }
    const questao = nota.questoes.find((q) => q.versaoQuestaoId === versaoQuestaoId);
    if (!questao) throw new NotFoundException('Questão não encontrada nesta tentativa');
    if (questao.natureza !== 'ABERTA') {
      throw new BadRequestException('Questões fechadas são corrigidas automaticamente');
    }
    const { fracao, avaliacaoItens } = fracaoDaAvaliacao(questao.rubrica, avaliacao);
    if (nota.correcaoDupla) return this.corrigirEmDupla(u, nota, questao.id, versaoQuestaoId, fracao, avaliacaoItens, feedback);

    const consolidou = await this.prisma.$transaction(async (tx) => {
      // Dois corretores na mesma nota: o segundo espera o primeiro e vê a questão dele já corrigida.
      await this.travarNotas(tx, [notaId]);
      await this.garantirNaoConsolidada(tx, notaId);
      await tx.correcaoQuestao.update({
        where: { id: questao.id },
        data: {
          fracao,
          avaliacaoItens: avaliacaoItens ? (avaliacaoItens as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
          feedback: feedback?.trim() || null,
          automatica: false,
          corrigidoPorId: u.id,
          corrigidoEm: new Date(),
        },
      });
      return this.recalcular(notaId, tx);
    });

    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'CORRECAO_MANUAL',
      recurso: 'nota',
      recursoId: notaId,
      dados: { versaoQuestaoId, percentual: Math.round(fracao * 100), porCriterios: !!avaliacaoItens },
    });
    if (consolidou) await this.notificarResultado(notaId);
    return this.obter(u, notaId);
  }

  // ------------------------------------------------- aluno

  async resultadosDoAluno(alunoId: string) {
    return this.prisma.nota.findMany({
      where: { usuarioId: alunoId },
      orderBy: { fimEm: 'desc' },
      select: {
        id: true,
        provaTitulo: true,
        tentativaNumero: true,
        fimEm: true,
        status: true,
        notaFinal: true,
        notaProvisoria: true,
        statusAprovacao: true,
      },
    });
  }

  /**
   * Visão do aluno: nota, situação por questão e feedback. O gabarito só aparece conforme a
   * política da prova (nunca / após a correção / após o encerramento — feature 021).
   */
  async resultadoDoAluno(alunoId: string, notaId: string) {
    const nota = await this.prisma.nota.findFirst({
      where: { id: notaId, usuarioId: alunoId },
      include: { questoes: { orderBy: { ordem: 'asc' } } },
    });
    if (!nota) throw new NotFoundException('Resultado não encontrado');
    const anulacoes = await this.anulacoesDaProva(nota.provaId);
    const mostrarGabarito = gabaritoVisivel(nota);
    const fimRecurso = prazoRecursoFim(nota);
    return {
      id: nota.id,
      provaTitulo: nota.provaTitulo,
      exibirGabarito: nota.exibirGabarito,
      gabaritoVisivel: mostrarGabarito,
      gabaritoDisponivelEm:
        !mostrarGabarito && nota.exibirGabarito === 'APOS_ENCERRAMENTO' ? nota.janelaFim : null,
      prazoRecursoAte: fimRecurso,
      recursoEncerrado: !!fimRecurso && fimRecurso < new Date(),
      notasSecao: nota.notasSecao,
      tentativaNumero: nota.tentativaNumero,
      inicioEm: nota.inicioEm,
      fimEm: nota.fimEm,
      status: nota.status,
      notaFinal: nota.notaFinal,
      notaProvisoria: nota.notaProvisoria,
      statusAprovacao: nota.statusAprovacao,
      criterioAprovacao: nota.criterioAprovacao,
      questoes: nota.questoes.map((q) => ({
        versaoQuestaoId: q.versaoQuestaoId,
        ordem: q.ordem,
        natureza: q.natureza,
        formato: q.formato,
        secaoId: q.secaoId,
        peso: q.peso,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        midias: q.midias,
        gabarito: mostrarGabarito ? q.gabarito : null,
        rubrica: mostrarGabarito ? q.rubrica : null,
        resposta: q.resposta,
        fracao: q.fracao,
        feedback: q.feedback,
        anulacao: anulacoes.get(q.versaoQuestaoId) ?? null,
      })),
    };
  }

  // ------------------------------------------------- integração (lote 8)

  /** Resultados consolidados para sistemas acadêmicos: paginação por cursor (consolidadaEm, id). */
  async notasParaIntegracao(f: { desde?: Date; provaId?: string; turmaIds?: string[]; cursor?: string; limite: number }) {
    let apos: { em: Date; id: string } | null = null;
    if (f.cursor) {
      const [em, id] = Buffer.from(f.cursor, 'base64url').toString().split('|');
      if (!em || !id || Number.isNaN(Date.parse(em))) throw new BadRequestException('Cursor inválido');
      apos = { em: new Date(em), id };
    }
    const notas = await this.prisma.nota.findMany({
      where: {
        status: 'CONSOLIDADA',
        usuarioId: { not: null },
        ...(f.provaId ? { provaId: f.provaId } : {}),
        ...(f.turmaIds ? { turmaId: { in: f.turmaIds } } : {}),
        ...(f.desde ? { consolidadaEm: { gte: f.desde } } : {}),
        ...(apos ? { OR: [{ consolidadaEm: { gt: apos.em } }, { consolidadaEm: apos.em, id: { gt: apos.id } }] } : {}),
      },
      orderBy: [{ consolidadaEm: 'asc' }, { id: 'asc' }],
      take: f.limite + 1,
    });
    const pagina = notas.slice(0, f.limite);
    const ultima = pagina.at(-1);
    return {
      itens: pagina,
      proximoCursor:
        notas.length > f.limite && ultima?.consolidadaEm
          ? Buffer.from(`${ultima.consolidadaEm.toISOString()}|${ultima.id}`).toString('base64url')
          : null,
    };
  }

  // ------------------------------------------------- LGPD

  /** Mantém notas (registro acadêmico) sem nome/e-mail do titular. */
  async anonimizarParticipante(alvo: { usuarioId: string } | { email: string }, tx: Tx): Promise<number> {
    const { count } = await tx.nota.updateMany({
      where: 'usuarioId' in alvo ? { usuarioId: alvo.usuarioId } : { usuarioId: null, participanteEmail: alvo.email.trim().toLowerCase() },
      data: { participanteNome: 'Titular anonimizado', participanteEmail: '' },
    });
    return count;
  }

  /** Retenção (lote 8): anonimiza notas de participantes externos enviadas antes de `limite`. */
  async anonimizarExternosAntigos(limite: Date, tx: Tx): Promise<number> {
    const { count } = await tx.nota.updateMany({
      where: { usuarioId: null, fimEm: { lt: limite }, NOT: { participanteEmail: '' } },
      data: { participanteNome: 'Titular anonimizado', participanteEmail: '' },
    });
    return count;
  }

  /** LGPD — correção do nome pelo titular: atualiza também os resultados guardados. */
  async corrigirNomeParticipante(usuarioId: string, nome: string, tx: Tx): Promise<number> {
    return (await tx.nota.updateMany({ where: { usuarioId }, data: { participanteNome: nome } })).count;
  }

  // ------------------------------------------------- usado por relatórios

  /** Dados brutos para agregação nos relatórios (leitura). */
  async notasParaRelatorio(filtro: {
    provaIds?: string[] | null;
    provaId?: string;
    aplicacaoId?: string;
    turmaId?: string;
    usuarioId?: string;
    /** Período pelo envio da tentativa: [de, ate). */
    de?: Date;
    ate?: Date;
    /** Enunciado e resposta de cada questão: só o relatório de uma prova usa (por questão, indícios). */
    detalhado?: boolean;
  }) {
    return this.prisma.nota.findMany({
      where: {
        ...(filtro.provaIds ? { provaId: { in: filtro.provaIds } } : {}),
        ...(filtro.provaId ? { provaId: filtro.provaId } : {}),
        ...(filtro.aplicacaoId ? { aplicacaoId: filtro.aplicacaoId } : {}),
        ...(filtro.turmaId ? { turmaId: filtro.turmaId } : {}),
        ...(filtro.usuarioId ? { usuarioId: filtro.usuarioId } : {}),
        ...(filtro.de || filtro.ate
          ? { fimEm: { ...(filtro.de ? { gte: filtro.de } : {}), ...(filtro.ate ? { lt: filtro.ate } : {}) } }
          : {}),
      },
      include: {
        questoes: {
          select: {
            versaoQuestaoId: true,
            ordem: true,
            natureza: true,
            formato: true,
            disciplina: true,
            peso: true,
            enunciado: !!filtro.detalhado,
            fracao: true,
            resposta: !!filtro.detalhado,
          },
        },
      },
      orderBy: { fimEm: 'asc' },
    });
  }

  async anulacoesDasProvas(provaIds: string[]) {
    if (!provaIds.length) return [];
    return this.prisma.anulacao.findMany({ where: { provaId: { in: provaIds } }, select: { provaId: true, versaoQuestaoId: true } });
  }

  async anulacoesDe(provaId: string) {
    return this.anulacoesDaProva(provaId);
  }

  // ------------------------------------------------- usado por recursos

  async notaDoAluno(alunoId: string, notaId: string) {
    return this.prisma.nota.findFirst({
      where: { id: notaId, usuarioId: alunoId },
      include: { questoes: true },
    });
  }

  async resumosNotas(ids: string[]) {
    const notas = await this.prisma.nota.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: {
        id: true,
        provaId: true,
        provaTitulo: true,
        participanteNome: true,
        participanteEmail: true,
        questoes: { select: { versaoQuestaoId: true, ordem: true, enunciado: true } },
      },
    });
    return new Map(notas.map((n) => [n.id, n]));
  }

  async anulacao(provaId: string, versaoQuestaoId: string) {
    return this.prisma.anulacao.findUnique({
      where: { provaId_versaoQuestaoId: { provaId, versaoQuestaoId } },
    });
  }

  async notaComQuestoes(notaId: string) {
    return this.prisma.nota.findUnique({ where: { id: notaId }, include: { questoes: { orderBy: { ordem: 'asc' } } } });
  }

  /** Deferimento individual: ajusta a pontuação de uma questão de uma tentativa. */
  async ajustarQuestao(notaId: string, versaoQuestaoId: string, fracao: number, usuarioId: string, tx: Tx) {
    await this.travarNotas(tx, [notaId]);
    const { count } = await tx.correcaoQuestao.updateMany({
      where: { notaId, versaoQuestaoId },
      data: { fracao, automatica: false, corrigidoPorId: usuarioId, corrigidoEm: new Date() },
    });
    if (count === 0) throw new NotFoundException('Questão não encontrada nesta tentativa');
    await this.recalcular(notaId, tx);
  }

  /**
   * Anulação de questão (RF08 — alternativa): vale para todos os participantes da prova.
   * Reprocessa todas as notas afetadas e devolve os alunos a notificar.
   */
  async anularQuestao(
    provaId: string,
    versaoQuestaoId: string,
    politica: Politica,
    justificativa: string,
    usuarioId: string,
    tx: Tx,
  ) {
    const ja = await tx.anulacao.findUnique({ where: { provaId_versaoQuestaoId: { provaId, versaoQuestaoId } } });
    if (ja) throw new ConflictException('Esta questão já foi anulada nesta prova');
    await tx.anulacao.create({
      data: { provaId, versaoQuestaoId, politica, justificativa, criadoPorId: usuarioId },
    });
    const afetadas = await tx.nota.findMany({
      where: { provaId, questoes: { some: { versaoQuestaoId } } },
      select: { id: true, usuarioId: true },
    });
    await this.travarNotas(tx, afetadas.map((n) => n.id));
    // Em lote: anulações lidas uma vez e notas carregadas por blocos (antes: ~4 consultas por nota,
    // o que estourava o tempo da transação em provas com muitos participantes).
    const anulacoes = await this.mapaAnulacoes(tx, provaId);
    for (let i = 0; i < afetadas.length; i += 200) {
      const bloco = await tx.nota.findMany({
        where: { id: { in: afetadas.slice(i, i + 200).map((n) => n.id) } },
        include: { questoes: true },
      });
      for (const nota of bloco) await this.gravarCalculo(nota, anulacoes, tx);
    }
    return afetadas;
  }

  // ---------------------------------------------------------------- apoio

  /** Recalcula a nota; devolve true se ela acabou de ser consolidada. */
  /** Dupla correção (lote 9 — ADR-0053). */
  private async corrigirEmDupla(
    u: UsuarioAutenticado,
    nota: { id: string; provaId: string; limiarDivergencia: number },
    correcaoQuestaoId: string,
    versaoQuestaoId: string,
    fracao: number,
    avaliacaoItens: unknown,
    feedback?: string,
  ) {
    const arbitra = (await this.provasQueArbitra(u, [nota.provaId])).has(nota.provaId);
    const { consolidou, d } = await this.prisma.$transaction(async (tx) => {
      // O papel (1ª, 2ª correção ou arbitragem) é decidido depois da trava: dois corretores
      // simultâneos não viram ambos "PRIMEIRA" nem sobrescrevem a avaliação um do outro.
      await this.travarNotas(tx, [nota.id]);
      await this.garantirNaoConsolidada(tx, nota.id);
      const existentes = await tx.avaliacaoCorrecao.findMany({ where: { correcaoQuestaoId } });
      const d = decidirDupla(
        existentes.map((a) => ({ papel: a.papel, corretorId: a.corretorId, fracao: Number(a.fracao) })),
        u.id,
        arbitra,
        nota.limiarDivergencia,
        fracao,
      );
      if ('erro' in d) throw new ConflictException(d.erro);
      const dados = {
        corretorId: u.id,
        fracao,
        feedback: feedback?.trim() || null,
        avaliacaoItens: avaliacaoItens ? (avaliacaoItens as Prisma.InputJsonValue) : Prisma.DbNull,
      };
      await tx.avaliacaoCorrecao.upsert({
        where: { correcaoQuestaoId_papel: { correcaoQuestaoId, papel: d.papel } },
        create: { correcaoQuestaoId, papel: d.papel, ...dados },
        update: dados,
      });
      // Feedback ao aluno: o do árbitro; na média, o da 2ª correção (ou o da 1ª, se a 2ª não tiver).
      const feedbackFinal =
        d.fracaoFinal == null
          ? null
          : feedback?.trim() || existentes.find((a) => a.papel === 'PRIMEIRA')?.feedback || null;
      await tx.correcaoQuestao.update({
        where: { id: correcaoQuestaoId },
        data: {
          fracao: d.fracaoFinal,
          aguardaArbitragem: d.aguardaArbitragem,
          automatica: false,
          ...(d.fracaoFinal != null ? { feedback: feedbackFinal, corrigidoPorId: u.id, corrigidoEm: new Date() } : {}),
        },
      });
      return { consolidou: await this.recalcular(nota.id, tx), d };
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: d.papel === 'ARBITRAGEM' ? 'CORRECAO_ARBITRAGEM' : 'CORRECAO_DUPLA',
      recurso: 'nota',
      recursoId: nota.id,
      dados: { versaoQuestaoId, papel: d.papel, percentual: Math.round(fracao * 100), aguardaArbitragem: d.aguardaArbitragem },
    });
    if (d.aguardaArbitragem) {
      const autor = await this.provas.autor(nota.provaId);
      await this.notificacoes.notificar([autor], {
        tipo: 'CORRECAO_ARBITRAGEM',
        titulo: 'Correção aguardando arbitragem',
        mensagem: 'As duas correções de uma questão divergiram acima do limiar da prova. Dê a nota final.',
        link: `/app/correcoes/${nota.id}`,
      });
    }
    if (consolidou) await this.notificarResultado(nota.id);
    return this.obter(u, nota.id);
  }

  /** Provas em que o usuário pode arbitrar: autor da prova ou gestão. */
  private async provasQueArbitra(u: UsuarioAutenticado, provaIds: string[]): Promise<Set<string>> {
    if (ehGestor(u)) return new Set(provaIds);
    const minhas = await this.provas.idsVisiveis(u);
    return new Set(provaIds.filter((id) => minhas?.includes(id)));
  }

  private async recalcular(notaId: string, tx: Tx): Promise<boolean> {
    const nota = await tx.nota.findUniqueOrThrow({ where: { id: notaId }, include: { questoes: true } });
    return this.gravarCalculo(nota, await this.mapaAnulacoes(tx, nota.provaId), tx);
  }

  /**
   * Trava as notas até o fim da transação (ordem fixa por id, para não haver deadlock entre
   * anulação, recurso e correção manual simultâneos).
   */
  private async travarNotas(tx: Tx, ids: string[]) {
    if (!ids.length) return;
    await tx.$queryRaw`SELECT id FROM correcao.notas WHERE id = ANY(${ids}::uuid[]) ORDER BY id FOR UPDATE`;
  }

  private async garantirNaoConsolidada(tx: Tx, notaId: string) {
    const atual = await tx.nota.findUnique({ where: { id: notaId }, select: { status: true } });
    if (atual?.status === 'CONSOLIDADA') {
      throw new ConflictException('Resultado já consolidado — alterações só por recurso');
    }
  }

  private async mapaAnulacoes(tx: Tx, provaId: string) {
    const anulacoes = await tx.anulacao.findMany({ where: { provaId } });
    return new Map(anulacoes.map((a) => [a.versaoQuestaoId, a.politica]));
  }

  private async gravarCalculo(
    nota: Prisma.NotaGetPayload<{ include: { questoes: true } }>,
    anulacoes: Map<string, Politica>,
    tx: Tx,
  ): Promise<boolean> {
    const notaId = nota.id;
    const r = calcularNota(
      nota.questoes.map((q) => ({
        versaoQuestaoId: q.versaoQuestaoId,
        secaoId: q.secaoId,
        peso: Number(q.peso),
        fracao: q.fracao == null ? null : Number(q.fracao),
      })),
      anulacoes,
      nota.criterioAprovacao as unknown as CriterioAprovacao,
      (nota.secoes as unknown as SecaoParaCalculo[] | null) ?? [],
    );
    const consolidando = !r.pendente && nota.status !== 'CONSOLIDADA';
    await tx.nota.update({
      where: { id: notaId },
      data: {
        notaProvisoria: r.notaProvisoria,
        notaFinal: r.notaFinal,
        statusAprovacao: r.statusAprovacao,
        notasSecao: r.notasSecao.length ? (r.notasSecao as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        status: r.pendente ? 'PENDENTE_CORRECAO_MANUAL' : 'CONSOLIDADA',
        ...(consolidando ? { consolidadaEm: new Date() } : {}),
      },
    });
    return consolidando;
  }

  private async anulacoesDaProva(provaId: string) {
    const anulacoes = await this.prisma.anulacao.findMany({ where: { provaId } });
    return new Map(anulacoes.map((a) => [a.versaoQuestaoId, { politica: a.politica, justificativa: a.justificativa }]));
  }

  private async whereVisivel(u: UsuarioAutenticado): Promise<Prisma.NotaWhereInput> {
    // Corretores designados (lote 8): idsCorrigiveis considera a designação por prova.
    const ids = await this.provas.idsCorrigiveis(u);
    return ids === null ? {} : { provaId: { in: ids } };
  }
}

/**
 * Correção às cegas (lote 8 — ADR-0049): enquanto o resultado não consolida, o corretor vê só um
 * código estável do participante. Relatórios e acompanhamento não são afetados.
 */
export function mascarar(n: { id: string; participanteNome: string; participanteEmail: string; correcaoAsCegas: boolean; status: string }) {
  const asCegas = n.correcaoAsCegas && n.status !== 'CONSOLIDADA';
  return asCegas
    ? { participanteNome: `Participante ${n.id.slice(-6).toUpperCase()}`, participanteEmail: '', asCegas }
    : { participanteNome: n.participanteNome, participanteEmail: n.participanteEmail, asCegas };
}

/**
 * Às cegas, também não saem os IDs do aluno e da tentativa: com eles, quem tem outra permissão
 * (ex.: desbloquear contas) chegaria ao nome pela ficha do usuário (BUG-046).
 */
export function semIdentificadores(n: { correcaoAsCegas: boolean; status: string }) {
  return n.correcaoAsCegas && n.status !== 'CONSOLIDADA' ? { usuarioId: null, tentativaId: null } : {};
}

/** Fração da questão a partir do percentual ou dos pontos por critério da rubrica (lote 8). */
export function fracaoDaAvaliacao(
  rubrica: unknown,
  avaliacao: { percentual?: number; pontosItens?: number[] },
): { fracao: number; avaliacaoItens: { descricao: string; pontos: number; maximo: number }[] | null } {
  const itens = (rubrica as { itens?: { descricao: string; pontos: number }[] } | null)?.itens ?? [];
  if (avaliacao.pontosItens) {
    if (itens.length === 0) throw new BadRequestException('Esta questão não tem critérios pontuados; informe o percentual');
    if (avaliacao.pontosItens.length !== itens.length) throw new BadRequestException('Informe os pontos de todos os critérios');
    if (avaliacao.pontosItens.some((p, i) => p > itens[i]!.pontos)) throw new BadRequestException('Pontos acima do máximo do critério');
    const total = itens.reduce((s, i) => s + i.pontos, 0);
    const obtido = avaliacao.pontosItens.reduce((s, p) => s + p, 0);
    return {
      fracao: Math.round((obtido / total) * 10_000) / 10_000,
      avaliacaoItens: itens.map((i, k) => ({ descricao: i.descricao, pontos: avaliacao.pontosItens![k]!, maximo: i.pontos })),
    };
  }
  if (avaliacao.percentual == null) throw new BadRequestException('Informe o percentual ou os pontos dos critérios');
  return { fracao: avaliacao.percentual / 100, avaliacaoItens: null };
}
