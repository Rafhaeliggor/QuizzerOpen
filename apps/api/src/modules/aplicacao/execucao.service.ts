import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import type { Env } from '../../config/env.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { StatusTentativa } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { CorrecaoService } from '../correcao/correcao.service.js';
import { ProvasService } from '../provas/provas.service.js';
import { TurmasService } from '../turmas/turmas.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import {
  calcularPrazo,
  formatoDe,
  gerarCodigoComprovante,
  montarInstancia,
  type GabaritoCongelado,
  type QuestaoFixada,
} from './instancia.js';

/** Quem está respondendo: aluno autenticado ou participante externo (prova pública). */
export type Ator =
  | { tipo: 'ALUNO'; usuarioId: string }
  | { tipo: 'EXTERNO'; instanciaId: string };

export interface ValorResposta {
  alternativaId?: string | null;
  /** Associação: item → opção. */
  pares?: Record<string, string> | null;
  /** Ordenação: ids na ordem escolhida. */
  ordem?: string[] | null;
  alternativaIds?: string[] | null;
  texto?: string | null;
}

/** Tolerância de rede para autosave/envio após o prazo (o cronômetro do cliente é só visual). */
const TOLERANCIA_MS = 10_000;
const EM_ANDAMENTO: StatusTentativa[] = ['EM_ANDAMENTO', 'REABERTA'];
const AUDIENCIA_PARTICIPANTE = 'quizzer-participante';
const INTERVALO_VARREDURA_MS = 30_000;
/** Teto de eventos de comportamento por tentativa (evita inflar a tabela por cliente malicioso). */
const MAX_EVENTOS_TENTATIVA = 500;

type TentativaCarregada = Prisma.TentativaGetPayload<{
  include: { instancia: { include: { aplicacao: true } }; respostas: true };
}>;

/** Autosave: só o que a gravação usa — sem gabarito congelado nem respostas (turma inteira salvando). */
const SELECAO_AUTOSAVE = {
  id: true,
  status: true,
  sessaoExecucao: true,
  prazoEm: true,
  instancia: {
    select: { id: true, participanteId: true, questoesFixadas: true, aplicacao: { select: { provaId: true } } },
  },
} satisfies Prisma.TentativaSelect;
type TentativaAutosave = Prisma.TentativaGetPayload<{ select: typeof SELECAO_AUTOSAVE }>;

/** Validade dos caches por prova (composição e modo de navegação de prova publicada não mudam). */
const CACHE_PROVA_MS = 5 * 60_000;
const CACHE_PROVA_MAX = 200;

/**
 * RF06 — Responder prova. O servidor é a única fonte de verdade do tempo:
 * `prazo_em` é calculado no início e toda escrita é validada contra ele (RNF03).
 * Desconectar não pausa nada; ao expirar, as respostas já salvas são enviadas.
 */
@Injectable()
export class ExecucaoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecucaoService.name);
  private varredura?: NodeJS.Timeout;
  /** provaId → modo de navegação (autosave consulta a cada gravação). */
  private readonly modoNavegacaoCache = new Map<string, { modo: string | null; ate: number }>();
  /** provaId → composição para o envio, válida enquanto `atualizadoEm` da prova não mudar. */
  private readonly composicaoCache = new Map<
    string,
    { versao: number; ate: number; prova: Awaited<ReturnType<ProvasService['paraAplicacao']>> }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly provas: ProvasService,
    private readonly turmas: TurmasService,
    private readonly usuarios: UsuariosService,
    private readonly correcao: CorrecaoService,
    private readonly auditoria: AuditoriaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit() {
    if (this.config.get('NODE_ENV', { infer: true }) === 'test') return;
    this.varredura = setInterval(() => {
      this.finalizarExpiradas().catch((erro: unknown) =>
        this.logger.error({ erro }, 'Falha na varredura de tentativas expiradas'),
      );
    }, INTERVALO_VARREDURA_MS);
    this.varredura.unref();
  }

  onModuleDestroy() {
    if (this.varredura) clearInterval(this.varredura);
  }

  // ---------------------------------------------------------------- início

  /** Aluno inicia (ou retoma) a prova de uma aplicação direcionada à sua turma. */
  async iniciarAluno(alunoId: string, aplicacaoId: string) {
    const aplicacao = await this.prisma.aplicacao.findUnique({
      where: { id: aplicacaoId },
      include: { alunos: { where: { alunoId }, select: { id: true } } },
    });
    const elegivel =
      !!aplicacao &&
      ((aplicacao.destinoTipo === 'TURMA' &&
        !!aplicacao.turmaId &&
        (await this.turmas.alunoMatriculado(aplicacao.turmaId, alunoId))) ||
        (aplicacao.destinoTipo === 'ALUNO_AVULSO' && aplicacao.alunos.length > 0));
    if (!aplicacao || !elegivel) {
      throw new NotFoundException('Prova não disponível para você');
    }
    const [aluno] = (await this.usuarios.resumos([alunoId])).values();
    const prova = (await this.provas.resumos([aplicacao.provaId])).get(aplicacao.provaId);
    if (prova?.exigeMfa && !(await this.usuarios.mfaHabilitado(alunoId))) {
      throw new ConflictException({
        message: 'Esta prova exige verificação em duas etapas. Ative-a em "Minha conta" e inicie a prova de novo.',
        codigo: 'MFA_NECESSARIO',
      });
    }
    return this.iniciar(aplicacao, {
      chave: `u:${alunoId}`,
      participanteId: alunoId,
      identificacao: null,
      auditoriaUsuarioId: alunoId,
      nome: aluno?.nome ?? '',
    });
  }

  /** Participante externo inicia prova pública por PIN com identificação mínima. */
  async iniciarExterno(pin: string, nome: string, email: string) {
    const aplicacao = await this.aplicacaoPorPin(pin);
    const emailNorm = email.trim().toLowerCase();
    const { tentativa, instanciaId } = await this.iniciar(aplicacao, {
      chave: `e:${emailNorm}`,
      participanteId: null,
      identificacao: { nome: nome.trim(), email: emailNorm },
      auditoriaUsuarioId: null,
      nome: nome.trim(),
      bloquearRetomada: true,
    });
    const expiraEmSeg = Math.ceil((tentativa.prazoEm.getTime() - Date.now()) / 1000) + 2 * 3600;
    const token = await this.jwt.signAsync(
      { sub: tentativa.id, ins: instanciaId },
      { audience: AUDIENCIA_PARTICIPANTE, expiresIn: Math.max(expiraEmSeg, 60) },
    );
    return { tentativaId: tentativa.id, token };
  }

  async infoPublica(pin: string) {
    const aplicacao = await this.aplicacaoPorPin(pin, false);
    const prova = (await this.provas.resumos([aplicacao.provaId])).get(aplicacao.provaId);
    const agora = new Date();
    return {
      titulo: prova?.titulo ?? '',
      descricao: prova?.descricao ?? null,
      tempoLimiteMin: prova?.tempoLimiteMin ?? null,
      totalQuestoes: prova?.totalQuestoes ?? 0,
      janelaInicio: aplicacao.janelaInicio,
      janelaFim: aplicacao.janelaFim,
      situacao: agora < aplicacao.janelaInicio ? 'AGENDADA' : agora > aplicacao.janelaFim ? 'ENCERRADA' : 'DISPONIVEL',
      certificado: false,
    };
  }

  /** Valida o token do participante externo e devolve o ator. */
  async atorExterno(authorization: string | undefined, tentativaId: string): Promise<Ator> {
    const [tipo, token] = authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token) throw new UnauthorizedException('Acesso do participante ausente');
    try {
      const p = await this.jwt.verifyAsync<{ sub: string; ins: string }>(token, {
        audience: AUDIENCIA_PARTICIPANTE,
      });
      if (p.sub !== tentativaId) throw new Error('tentativa diferente');
      return { tipo: 'EXTERNO', instanciaId: p.ins };
    } catch {
      throw new UnauthorizedException('Acesso do participante inválido ou expirado');
    }
  }

  // ---------------------------------------------------------------- execução

  /** Tudo que a tela de execução precisa — sem gabarito. */
  async obter(ator: Ator, tentativaId: string) {
    const t = await this.carregar(ator, tentativaId);
    const prova = (await this.provas.resumos([t.instancia.aplicacao.provaId])).get(t.instancia.aplicacao.provaId);
    const questoes = t.instancia.questoesFixadas as unknown as QuestaoFixada[];
    return {
      tentativa: {
        id: t.id,
        numero: t.numero,
        status: t.status,
        inicioEm: t.inicioEm,
        prazoEm: t.prazoEm,
        fimEm: t.fimEm,
      },
      agora: new Date(),
      prova: {
        titulo: prova?.titulo ?? '',
        modoNavegacao: prova?.modoNavegacao ?? 'LIVRE',
      },
      questoes: questoes.map((q) => ({
        versaoQuestaoId: q.versaoQuestaoId,
        ordem: q.ordem,
        natureza: q.natureza,
        formato: formatoDe(q),
        secaoTitulo: q.secaoTitulo ?? null,
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        midias: q.midias ?? [],
      })),
      respostas: Object.fromEntries(t.respostas.map((r) => [r.versaoQuestaoId, r.valor])),
    };
  }

  /**
   * Sessão única por tentativa (RF06): o dispositivo/aba que abre a prova recebe um
   * identificador; só ele grava respostas e envia. Abrir em outro lugar ASSUME a
   * tentativa (o anterior recebe 409 SESSAO_SUBSTITUIDA) — a troca é contada e auditada.
   */
  async abrirSessao(ator: Ator, tentativaId: string) {
    const t = await this.carregar(ator, tentativaId);
    this.garantirEmAndamento(t);
    const sessaoExecucao = randomBytes(18).toString('base64url');
    const assumiu = t.sessaoExecucao !== null;
    await this.prisma.tentativa.update({
      where: { id: t.id },
      data: { sessaoExecucao, ...(assumiu ? { trocasSessao: { increment: 1 } } : {}) },
    });
    if (assumiu) {
      await this.auditoria.registrar({
        usuarioId: t.instancia.participanteId,
        acao: 'TENTATIVA_SESSAO_ASSUMIDA',
        recurso: 'tentativa',
        recursoId: t.id,
        dados: { trocas: t.trocasSessao + 1 },
      });
    }
    return { sessaoExecucao };
  }

  /** Autosave (RF06 passo 5): upsert por questão, validado contra o prazo do servidor. */
  async salvarResposta(
    ator: Ator,
    tentativaId: string,
    versaoQuestaoId: string,
    valor: ValorResposta,
    sessao: string | undefined,
  ) {
    const t = await this.carregarParaAutosave(ator, tentativaId);
    this.garantirEmAndamento(t);
    this.garantirSessao(t, sessao);

    const questoes = t.instancia.questoesFixadas as unknown as QuestaoFixada[];
    const idx = questoes.findIndex((q) => q.versaoQuestaoId === versaoQuestaoId);
    const questao = questoes[idx];
    if (!questao) throw new NotFoundException('Questão não pertence a esta prova');

    const modoNavegacao = await this.modoNavegacao(t.instancia.aplicacao.provaId);
    let dado: Prisma.InputJsonValue;
    const formato = formatoDe(questao);
    if (formato === 'ASSOCIACAO') {
      const itens = new Set(questao.alternativas?.filter((a) => a.grupo === 'ITEM').map((a) => a.id));
      const opcoes = new Set(questao.alternativas?.filter((a) => a.grupo === 'OPCAO').map((a) => a.id));
      const pares = Object.entries(valor.pares ?? {}).filter(([, o]) => o);
      if (pares.some(([i, o]) => !itens.has(i) || !opcoes.has(o))) throw new BadRequestException('Associação inválida');
      dado = { pares: Object.fromEntries(pares) };
    } else if (formato === 'ORDENACAO') {
      const ids = questao.alternativas?.map((a) => a.id) ?? [];
      const ordem = valor.ordem ?? [];
      if (ordem.length !== ids.length || new Set(ordem).size !== ids.length || ordem.some((x) => !ids.includes(x))) {
        throw new BadRequestException('Ordem inválida: envie todos os itens, sem repetir');
      }
      dado = { ordem };
    } else if (formato === 'MULTIPLA_RESPOSTA') {
      const ids = [...new Set(valor.alternativaIds ?? [])];
      if (ids.some((id) => !questao.alternativas?.some((a) => a.id === id))) {
        throw new BadRequestException('Alternativa inválida');
      }
      dado = { alternativaIds: ids.sort() };
    } else if (formato === 'MULTIPLA_ESCOLHA' || formato === 'VERDADEIRO_FALSO') {
      const id = valor.alternativaId ?? null;
      if (id !== null && !questao.alternativas?.some((a) => a.id === id)) {
        throw new BadRequestException('Alternativa inválida');
      }
      dado = { alternativaId: id };
    } else {
      const texto = valor.texto ?? '';
      const max = formato === 'RESPOSTA_NUMERICA' ? 50 : formato === 'RESPOSTA_CURTA' ? 500 : 20_000;
      if (texto.length > max) {
        throw new BadRequestException(`Resposta muito longa (máx. ${max.toLocaleString('pt-BR')} caracteres)`);
      }
      dado = { texto };
    }

    const r = await this.prisma.$transaction(async (tx) => {
      // Serializa autosave com envio final e troca de sessão. O estado é relido
      // depois do lock para nunca aceitar gravação baseada em uma leitura antiga.
      await tx.$queryRaw`SELECT id FROM aplicacao.tentativas WHERE id = ${tentativaId}::uuid FOR UPDATE`;
      const atual = await tx.tentativa.findUnique({
        where: { id: tentativaId },
        select: { status: true, sessaoExecucao: true },
      });
      if (!atual) throw new NotFoundException('Tentativa não encontrada');
      this.garantirEmAndamento(atual);
      this.garantirSessao(atual, sessao);

      if (modoNavegacao === 'SEQUENCIAL') {
        const respostasAtuais = await tx.resposta.findMany({ where: { tentativaId }, select: { versaoQuestaoId: true } });
        const indices = respostasAtuais.map((resposta) =>
          questoes.findIndex((q) => q.versaoQuestaoId === resposta.versaoQuestaoId),
        );
        if (idx < Math.max(-1, ...indices)) {
          throw new ConflictException({
            message: 'Nesta prova não é possível voltar a questões anteriores',
            codigo: 'NAVEGACAO_SEQUENCIAL',
          });
        }
      }

      return tx.resposta.upsert({
        where: { tentativaId_versaoQuestaoId: { tentativaId, versaoQuestaoId } },
        create: { tentativaId, versaoQuestaoId, valor: dado },
        update: { valor: dado },
      });
    });
    return { versaoQuestaoId, salvoEm: r.atualizadoEm };
  }

  /** Envio final (RF06 passo 6–7). Idempotente: reenviar devolve o mesmo comprovante. */
  async enviar(ator: Ator, tentativaId: string, sessao: string | undefined) {
    const t = await this.carregar(ator, tentativaId);
    if (EM_ANDAMENTO.includes(t.status)) {
      this.garantirSessao(t, sessao);
      const atrasado = Date.now() > t.prazoEm.getTime() + TOLERANCIA_MS;
      await this.finalizar(t.id, atrasado ? 'EXPIRADA' : 'ENVIADA');
    }
    return this.comprovante(ator, tentativaId);
  }

  async comprovante(ator: Ator, tentativaId: string) {
    const t = await this.carregar(ator, tentativaId);
    if (EM_ANDAMENTO.includes(t.status)) throw new ConflictException('A prova ainda não foi enviada');
    const questoes = t.instancia.questoesFixadas as unknown as QuestaoFixada[];
    const prova = (await this.provas.resumos([t.instancia.aplicacao.provaId])).get(t.instancia.aplicacao.provaId);
    const participante = await this.participante(t);
    const resultado = await this.correcao.resultadoDaTentativa(t.id);
    return {
      codigo: t.comprovanteCodigo,
      tentativaId: t.id,
      numero: t.numero,
      provaTitulo: prova?.titulo ?? '',
      participanteNome: participante.nome,
      participanteEmail: participante.email,
      status: t.status,
      inicioEm: t.inicioEm,
      fimEm: t.fimEm,
      respostasRegistradas: t.respostas.filter((r) => respondida(r.valor)).length,
      totalQuestoes: questoes.length,
      emitidoEm: new Date(),
      resultado:
        resultado && resultado.status === 'CONSOLIDADA'
          ? { notaFinal: resultado.notaFinal, statusAprovacao: resultado.statusAprovacao, notaId: resultado.id }
          : resultado
            ? { pendente: true }
            : null,
      certificado: t.instancia.participanteId !== null,
    };
  }

  // ---------------------------------------------------------------- comportamento

  /** Contadores de comportamento por tentativa (relatórios — indícios para revisão). */
  async sinais(tentativaIds: string[]) {
    const ids = [...new Set(tentativaIds)];
    if (ids.length === 0) return new Map<string, { saidasDeFoco: number; trocasSessao: number }>();
    const ts = await this.prisma.tentativa.findMany({
      where: { id: { in: ids } },
      select: { id: true, saidasDeFoco: true, trocasSessao: true },
    });
    return new Map(ts.map((t) => [t.id, { saidasDeFoco: t.saidasDeFoco, trocasSessao: t.trocasSessao }]));
  }

  /**
   * Eventos de comportamento (RF06 — "registro de eventos relevantes"): saída e volta da aba
   * da prova. Só registra; não penaliza nem bloqueia (ADR-0035). Fora do andamento, ignora.
   */
  async registrarEvento(ator: Ator, tentativaId: string, tipo: 'SAIU_DA_PROVA' | 'VOLTOU_A_PROVA', ocorridoEm?: Date) {
    const t = await this.carregar(ator, tentativaId);
    if (!EM_ANDAMENTO.includes(t.status)) return { registrado: false };
    const total = await this.prisma.eventoTentativa.count({ where: { tentativaId } });
    if (total >= MAX_EVENTOS_TENTATIVA) return { registrado: false };
    const agora = new Date();
    // Horário do cliente só é aceito se plausível (até 5 min no passado, nunca no futuro).
    const quando = ocorridoEm && ocorridoEm <= agora && agora.getTime() - ocorridoEm.getTime() < 300_000 ? ocorridoEm : agora;
    await this.prisma.$transaction([
      this.prisma.eventoTentativa.create({ data: { tentativaId, tipo, ocorridoEm: quando } }),
      ...(tipo === 'SAIU_DA_PROVA'
        ? [this.prisma.tentativa.update({ where: { id: tentativaId }, data: { saidasDeFoco: { increment: 1 } } })]
        : []),
    ]);
    return { registrado: true };
  }

  // ---------------------------------------------------------------- finalização

  /** Encerra a tentativa e dispara a correção na mesma transação. Idempotente. */
  async finalizar(tentativaId: string, status: 'ENVIADA' | 'EXPIRADA') {
    const t = await this.prisma.tentativa.findUnique({
      where: { id: tentativaId },
      include: { instancia: { include: { aplicacao: true } } },
    });
    if (!t) return;
    const prova = await this.composicao(t.instancia.aplicacao.provaId);
    const participante = await this.participante(t);
    // Instâncias antigas não guardavam a disciplina: vem da versão (imutável) da questão.
    const disciplinas = new Map(prova.itens.map((i) => [i.versao.id, i.versao.disciplina]));

    const resultado = await this.prisma.$transaction(async (tx) => {
      // Usa o mesmo lock do autosave: respostas confirmadas antes do envio entram
      // no snapshot; depois que o envio obtém o lock, novas gravações são recusadas.
      await tx.$queryRaw`SELECT id FROM aplicacao.tentativas WHERE id = ${tentativaId}::uuid FOR UPDATE`;
      const agora = new Date();
      const fimEm = agora > t.prazoEm ? t.prazoEm : agora;
      const { count } = await tx.tentativa.updateMany({
        where: { id: tentativaId, status: { in: EM_ANDAMENTO } },
        data: { status, fimEm, comprovanteCodigo: gerarCodigoComprovante() },
      });
      if (count === 0) return null; // já finalizada por outra requisição (duplo clique, varredura)

      const respostas = await tx.resposta.findMany({ where: { tentativaId } });
      const porQuestao = new Map(respostas.map((r) => [r.versaoQuestaoId, r.valor]));
      const questoes = t.instancia.questoesFixadas as unknown as QuestaoFixada[];
      const gabaritos = t.instancia.gabaritoCongelado as unknown as GabaritoCongelado;

      return this.correcao.registrarTentativa(
        {
          tentativaId,
          aplicacaoId: t.instancia.aplicacaoId,
          provaId: prova.id,
          turmaId: t.instancia.aplicacao.turmaId,
          usuarioId: t.instancia.participanteId,
          provaTitulo: prova.titulo,
          participanteNome: participante.nome,
          participanteEmail: participante.email,
          tentativaNumero: t.numero,
          certificado: t.instancia.participanteId !== null,
          criterioAprovacao: prova.criterioAprovacao,
          inicioEm: t.inicioEm,
          fimEm,
          exibirGabarito: prova.exibirGabarito,
          janelaFim: t.instancia.aplicacao.janelaFim,
          prazoRecursoDias: prova.prazoRecursoDias,
          secoes: prova.secoes.map((s) => ({ id: s.id, titulo: s.titulo, notaMinima: s.notaMinima })),
          correcaoAsCegas: prova.correcaoAsCegas,
          correcaoDupla: prova.correcaoDupla,
          limiarDivergencia: prova.limiarDivergencia,
          itens: questoes.map((q) => ({
            secaoId: q.secaoId ?? null,
            versaoQuestaoId: q.versaoQuestaoId,
            ordem: q.ordem,
            natureza: q.natureza,
            formato: formatoDe(q),
            disciplina: q.disciplina ?? disciplinas.get(q.versaoQuestaoId) ?? '',
            peso: q.peso,
            enunciado: q.enunciado,
            alternativas: q.alternativas,
            gabarito: gabaritos[q.versaoQuestaoId]?.gabarito ?? null,
            rubrica: gabaritos[q.versaoQuestaoId]?.rubrica ?? null,
            midias: gabaritos[q.versaoQuestaoId]?.midias ?? q.midias ?? null,
            resposta: porQuestao.get(q.versaoQuestaoId) ?? null,
          })),
        },
        tx,
      );
    });

    if (!resultado) return;
    await this.auditoria.registrar({
      usuarioId: t.instancia.participanteId,
      acao: status === 'ENVIADA' ? 'TENTATIVA_ENVIADA' : 'TENTATIVA_EXPIRADA',
      recurso: 'tentativa',
      recursoId: tentativaId,
      dados: { aplicacaoId: t.instancia.aplicacaoId },
    });
    if (resultado.consolidou) await this.correcao.notificarResultado(resultado.notaId);
  }

  /** Envio automático por fim de tempo (RF06 — exceção), rodando periodicamente. */
  async finalizarExpiradas(): Promise<number> {
    const vencidas = await this.prisma.tentativa.findMany({
      where: { status: { in: EM_ANDAMENTO }, prazoEm: { lt: new Date(Date.now() - TOLERANCIA_MS) } },
      select: { id: true },
      take: 200,
    });
    for (const v of vencidas) await this.finalizar(v.id, 'EXPIRADA');
    return vencidas.length;
  }

  // ---------------------------------------------------------------- LGPD

  /** Remove nome/e-mail de participante externo das instâncias (a chave também contém o e-mail). */
  async anonimizarExterno(email: string, tx: Prisma.TransactionClient): Promise<number> {
    const chave = `e:${email.trim().toLowerCase()}`;
    const instancias = await tx.instancia.findMany({ where: { participanteChave: chave }, select: { id: true } });
    for (const i of instancias) {
      await tx.instancia.update({
        where: { id: i.id },
        data: { participanteChave: `e:anonimizado:${i.id}`, identificacaoMinima: Prisma.DbNull },
      });
    }
    return instancias.length;
  }

  /** Retenção (lote 8): instâncias de externos cuja aplicação terminou antes de `limite`. */
  async anonimizarExternosAntigos(limite: Date, tx: Prisma.TransactionClient): Promise<number> {
    const instancias = await tx.instancia.findMany({
      where: {
        participanteId: null,
        participanteChave: { startsWith: 'e:', not: { startsWith: 'e:anonimizado:' } },
        aplicacao: { janelaFim: { lt: limite } },
      },
      select: { id: true },
    });
    for (const i of instancias) {
      await tx.instancia.update({
        where: { id: i.id },
        data: { participanteChave: `e:anonimizado:${i.id}`, identificacaoMinima: Prisma.DbNull },
      });
    }
    return instancias.length;
  }

  // ---------------------------------------------------------------- apoio

  private async iniciar(
    aplicacao: { id: string; provaId: string; janelaInicio: Date; janelaFim: Date },
    p: {
      chave: string;
      participanteId: string | null;
      identificacao: { nome: string; email: string } | null;
      auditoriaUsuarioId: string | null;
      nome: string;
      bloquearRetomada?: boolean;
    },
  ) {
    const agora = new Date();
    if (agora < aplicacao.janelaInicio) throw new ConflictException('A prova ainda não está disponível');
    if (agora > aplicacao.janelaFim) throw new ConflictException('O período para fazer esta prova terminou');

    const prova = await this.provas.paraAplicacao(aplicacao.provaId);
    const instancia = await this.obterOuCriarInstancia(aplicacao.id, p, prova);

    const tentativas = await this.prisma.tentativa.findMany({
      where: { instanciaId: instancia.id },
      orderBy: { numero: 'asc' },
    });
    const aberta = tentativas.find((t) => EM_ANDAMENTO.includes(t.status));
    if (aberta) {
      if (Date.now() <= aberta.prazoEm.getTime() + TOLERANCIA_MS) {
        if (p.bloquearRetomada) {
          throw new ConflictException(
            'Já existe uma tentativa em andamento para este e-mail. Continue no mesmo navegador em que começou.',
          );
        }
        return { tentativa: aberta, instanciaId: instancia.id };
      }
      await this.finalizar(aberta.id, 'EXPIRADA');
    }
    if (tentativas.length >= prova.tentativasPermitidas) {
      throw new ConflictException('Você já usou todas as tentativas permitidas para esta prova');
    }

    try {
      const tentativa = await this.prisma.tentativa.create({
        data: {
          instanciaId: instancia.id,
          numero: tentativas.length + 1,
          inicioEm: agora,
          prazoEm: calcularPrazo(agora, prova.tempoLimiteMin, aplicacao.janelaFim),
        },
      });
      await this.auditoria.registrar({
        usuarioId: p.auditoriaUsuarioId,
        acao: 'TENTATIVA_INICIADA',
        recurso: 'tentativa',
        recursoId: tentativa.id,
        // Sem nome/e-mail: a auditoria é imutável e não pode guardar dado pessoal (LGPD — ADR-0028).
        dados: { aplicacaoId: aplicacao.id, numero: tentativa.numero },
      });
      return { tentativa, instanciaId: instancia.id };
    } catch (erro) {
      // Duplo clique em "Iniciar": a outra requisição criou a tentativa — retoma a mesma.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        const existente = await this.prisma.tentativa.findFirstOrThrow({
          where: { instanciaId: instancia.id, status: { in: EM_ANDAMENTO } },
        });
        return { tentativa: existente, instanciaId: instancia.id };
      }
      throw erro;
    }
  }

  private async obterOuCriarInstancia(
    aplicacaoId: string,
    p: { chave: string; participanteId: string | null; identificacao: { nome: string; email: string } | null },
    prova: Awaited<ReturnType<ProvasService['paraAplicacao']>>,
  ) {
    const existente = await this.prisma.instancia.findUnique({
      where: { aplicacaoId_participanteChave: { aplicacaoId, participanteChave: p.chave } },
    });
    if (existente) return existente;
    const { questoesFixadas, gabaritoCongelado } = montarInstancia(prova);
    try {
      return await this.prisma.instancia.create({
        data: {
          aplicacaoId,
          participanteId: p.participanteId,
          participanteChave: p.chave,
          identificacaoMinima: p.identificacao ?? Prisma.DbNull,
          questoesFixadas: questoesFixadas as unknown as Prisma.InputJsonValue,
          gabaritoCongelado: gabaritoCongelado as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        return this.prisma.instancia.findUniqueOrThrow({
          where: { aplicacaoId_participanteChave: { aplicacaoId, participanteChave: p.chave } },
        });
      }
      throw erro;
    }
  }

  private async aplicacaoPorPin(pin: string, exigirJanela = true) {
    const aplicacao = await this.prisma.aplicacao.findUnique({
      where: { pinAcesso: pin.trim().toUpperCase() },
    });
    if (!aplicacao || aplicacao.destinoTipo !== 'PUBLICO') {
      throw new NotFoundException('Código de acesso inválido');
    }
    if (exigirJanela && new Date() > aplicacao.janelaFim) {
      throw new ConflictException('O período para fazer esta prova terminou');
    }
    return aplicacao;
  }

  /** Como `carregar`, com a leitura enxuta do autosave (mesma checagem de posse e de prazo). */
  private async carregarParaAutosave(ator: Ator, tentativaId: string): Promise<TentativaAutosave> {
    const buscar = () => this.prisma.tentativa.findUnique({ where: { id: tentativaId }, select: SELECAO_AUTOSAVE });
    const t = await buscar();
    const dono =
      t &&
      (ator.tipo === 'ALUNO' ? t.instancia.participanteId === ator.usuarioId : t.instancia.id === ator.instanciaId);
    if (!t || !dono) throw new NotFoundException('Tentativa não encontrada');
    if (EM_ANDAMENTO.includes(t.status) && Date.now() > t.prazoEm.getTime() + TOLERANCIA_MS) {
      await this.finalizar(t.id, 'EXPIRADA');
      return (await buscar())!;
    }
    return t;
  }

  private async modoNavegacao(provaId: string): Promise<string | null> {
    const agora = Date.now();
    const cache = this.modoNavegacaoCache.get(provaId);
    if (cache && cache.ate > agora) return cache.modo;
    const prova = await this.prisma.prova.findUnique({ where: { id: provaId }, select: { modoNavegacao: true } });
    const modo = prova?.modoNavegacao ?? null;
    limitarCache(this.modoNavegacaoCache);
    this.modoNavegacaoCache.set(provaId, { modo, ate: agora + CACHE_PROVA_MS });
    return modo;
  }

  /** Composição da prova para o envio; recarrega quando a prova muda (`atualizadoEm`). */
  private async composicao(provaId: string) {
    const agora = Date.now();
    const atual = await this.prisma.prova.findUnique({ where: { id: provaId }, select: { atualizadoEm: true } });
    const versao = atual?.atualizadoEm.getTime() ?? 0;
    const cache = this.composicaoCache.get(provaId);
    if (cache && cache.versao === versao && cache.ate > agora) return cache.prova;
    const prova = await this.provas.paraAplicacao(provaId);
    limitarCache(this.composicaoCache);
    this.composicaoCache.set(provaId, { versao, ate: agora + CACHE_PROVA_MS, prova });
    return prova;
  }

  /** Carrega a tentativa verificando a posse e aplicando a expiração preguiçosa. */
  private async carregar(ator: Ator, tentativaId: string): Promise<TentativaCarregada> {
    const buscar = () =>
      this.prisma.tentativa.findUnique({
        where: { id: tentativaId },
        include: { instancia: { include: { aplicacao: true } }, respostas: true },
      });
    const t = await buscar();
    const dono =
      t &&
      (ator.tipo === 'ALUNO'
        ? t.instancia.participanteId === ator.usuarioId
        : t.instancia.id === ator.instanciaId);
    if (!t || !dono) throw new NotFoundException('Tentativa não encontrada');

    if (EM_ANDAMENTO.includes(t.status) && Date.now() > t.prazoEm.getTime() + TOLERANCIA_MS) {
      await this.finalizar(t.id, 'EXPIRADA');
      return (await buscar())!;
    }
    return t;
  }

  private garantirEmAndamento(t: Pick<TentativaCarregada, 'status'>) {
    if (!EM_ANDAMENTO.includes(t.status)) {
      throw new ConflictException({
        message: t.status === 'EXPIRADA' ? 'O tempo acabou e a prova foi enviada automaticamente' : 'Esta prova já foi enviada',
        codigo: 'TENTATIVA_ENCERRADA',
      });
    }
  }

  private garantirSessao(t: Pick<TentativaCarregada, 'sessaoExecucao'>, sessao: string | undefined) {
    if (!sessao || t.sessaoExecucao !== sessao) {
      throw new ConflictException({
        message: 'Esta prova foi aberta em outro dispositivo ou aba. Continue por lá ou assuma a prova aqui.',
        codigo: 'SESSAO_SUBSTITUIDA',
      });
    }
  }

  private async participante(t: { instancia: { participanteId: string | null; identificacaoMinima: unknown } }) {
    if (t.instancia.participanteId) {
      const u = (await this.usuarios.resumos([t.instancia.participanteId])).get(t.instancia.participanteId);
      return { nome: u?.nome ?? '—', email: u?.email ?? '' };
    }
    const id = t.instancia.identificacaoMinima as { nome?: string; email?: string } | null;
    return { nome: id?.nome ?? '—', email: id?.email ?? '' };
  }
}

function respondida(valor: unknown): boolean {
  const v = valor as ValorResposta | null;
  return !!v && (!!v.alternativaId || !!v.alternativaIds?.length || !!v.texto?.trim() || !!v.ordem?.length || Object.keys(v.pares ?? {}).length > 0);
}

/** Mantém o cache por prova pequeno: descarta a entrada mais antiga ao atingir o teto. */
function limitarCache(cache: Map<string, unknown>) {
  if (cache.size >= CACHE_PROVA_MAX) cache.delete(cache.keys().next().value!);
}
