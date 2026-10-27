import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ehGestor } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { QuestoesService, type VersaoCompleta } from '../questoes/questoes.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { problemasDasSecoes, questoesPorParticipante, somaPesos } from './composicao.js';
import { ComporProvaDto, ComporSecoesDto, ListarProvasDto, SalvarProvaDto } from './dto.js';

export interface CriterioAprovacao {
  tipo: 'NOTA_MINIMA' | 'NENHUM';
  valor?: number;
}

/** Prova publicada pronta para gerar instâncias (inclui gabarito — uso interno). */
export interface ProvaParaAplicacao {
  id: string;
  autorId: string;
  titulo: string;
  descricao: string | null;
  visibilidade: 'PUBLICA' | 'PRIVADA';
  criterioAprovacao: CriterioAprovacao;
  tempoLimiteMin: number | null;
  tentativasPermitidas: number;
  modoNavegacao: 'SEQUENCIAL' | 'LIVRE';
  ordemQuestoes: 'FIXA' | 'RANDOMIZADA';
  exigeMfa: boolean;
  exibirGabarito: 'NUNCA' | 'APOS_CORRECAO' | 'APOS_ENCERRAMENTO';
  prazoRecursoDias: number | null;
  correcaoAsCegas: boolean;
  correcaoDupla: boolean;
  limiarDivergencia: number;
  tempoPorQuestaoSeg: number | null;
  secoes: SecaoParaAplicacao[];
  itens: { ordem: number; peso: number; secaoId: string | null; versao: VersaoCompleta }[];
}

export interface SecaoParaAplicacao {
  id: string;
  titulo: string;
  ordem: number;
  modo: 'FIXA' | 'SORTEIO';
  sortear: number | null;
  peso: number | null;
  notaMinima: number | null;
}

const incluirComposicao = {
  questoes: { orderBy: { ordem: 'asc' } },
  secoes: { orderBy: { ordem: 'asc' } },
} satisfies Prisma.ProvaInclude;

function secaoPublica(s: { id: string; titulo: string; ordem: number; modo: 'FIXA' | 'SORTEIO'; sortear: number | null; peso: unknown; notaMinima: unknown }): SecaoParaAplicacao {
  return {
    id: s.id,
    titulo: s.titulo,
    ordem: s.ordem,
    modo: s.modo,
    sortear: s.sortear,
    peso: s.peso == null ? null : Number(s.peso),
    notaMinima: s.notaMinima == null ? null : Number(s.notaMinima),
  };
}

const TOLERANCIA_PESO = 0.01;

/** RF05 — Composição manual de provas (pool/seções fora do MVP). */
@Injectable()
export class ProvasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questoes: QuestoesService,
    private readonly usuarios: UsuariosService,
    private readonly auditoria: AuditoriaService,
  ) {}

  private visiveis(u: UsuarioAutenticado): Prisma.ProvaWhereInput {
    return ehGestor(u) ? {} : { autorId: u.id };
  }

  async listar(u: UsuarioAutenticado, f: ListarProvasDto) {
    const provas = await this.prisma.prova.findMany({
      where: { ...this.visiveis(u), ...(f.status ? { status: f.status } : {}) },
      include: { questoes: { select: { peso: true, secaoId: true } }, secoes: { select: { id: true, modo: true, sortear: true, peso: true } } },
      orderBy: { atualizadoEm: 'desc' },
    });
    const autores = await this.usuarios.resumos(provas.map((p) => p.autorId));
    return provas.map(({ questoes, secoes, ...p }) => {
      const semSecao = questoes.filter((q) => !q.secaoId).map((q) => ({ peso: Number(q.peso) }));
      const porSecao = secoes.map((sec) => ({
        modo: sec.modo,
        sortear: sec.sortear,
        peso: sec.peso == null ? null : Number(sec.peso),
        itens: questoes.filter((q) => q.secaoId === sec.id).map((q) => ({ peso: Number(q.peso) })),
      }));
      return {
        ...p,
        autorNome: autores.get(p.autorId)?.nome ?? '—',
        totalQuestoes: questoesPorParticipante(semSecao.length, porSecao),
        somaPesos: somaPesos(semSecao, porSecao),
      };
    });
  }

  async obter(u: UsuarioAutenticado, id: string) {
    const prova = await this.buscar(u, id);
    const versoes = await this.questoes.versoesCompletas(prova.questoes.map((q) => q.versaoQuestaoId));
    const vigentes = await this.questoes.versoesVigentes(
      [...versoes.values()].map((v) => v.questaoId),
    );
    const itens = prova.questoes.map((q) => {
      const v = versoes.get(q.versaoQuestaoId);
      const vigente = v ? vigentes.get(v.questaoId) : undefined;
      return {
        secaoId: q.secaoId,
        /** Número da versão vigente quando é mais nova que a usada na prova (aviso — lote 7). */
        versaoMaisNova: vigente && v && vigente.numeroVersao > v.numeroVersao ? vigente.numeroVersao : null,
        versaoQuestaoId: q.versaoQuestaoId,
        ordem: q.ordem,
        peso: Number(q.peso),
        questaoId: v?.questaoId ?? null,
        numeroVersao: v?.numeroVersao ?? null,
        enunciado: v?.enunciado ?? '(versão indisponível)',
        natureza: v?.natureza ?? null,
        formato: v?.formato ?? null,
        midias: v?.midias ?? [],
        disciplina: v?.disciplina ?? null,
        dificuldade: v?.dificuldade ?? null,
        alternativas: v?.alternativas ?? null,
        gabarito: v?.gabarito ?? null,
        rubrica: v?.rubrica ?? null,
      };
    });
    const { questoes: _, secoes: secoesBrutas, corretores, ...resto } = prova;
    const secoes = secoesBrutas.map(secaoPublica);
    const porSecao = secoes.map((s) => ({ ...s, itens: itens.filter((i) => i.secaoId === s.id) }));
    const semSecao = itens.filter((i) => !i.secaoId);
    return {
      ...resto,
      itens,
      secoes,
      corretoresIds: corretores.map((c) => c.usuarioId),
      somaPesos: somaPesos(semSecao, porSecao),
      questoesPorParticipante: questoesPorParticipante(semSecao.length, porSecao),
    };
  }

  async criar(u: UsuarioAutenticado, dto: SalvarProvaDto) {
    const prova = await this.prisma.prova.create({ data: { autorId: u.id, ...this.dados(dto) } });
    return { id: prova.id };
  }

  async editar(u: UsuarioAutenticado, id: string, dto: SalvarProvaDto) {
    await this.buscarRascunho(u, id);
    await this.prisma.prova.update({ where: { id }, data: this.dados(dto) });
    return { id };
  }

  /** Substitui a composição (ordem = ordem da lista). Só questões publicadas. */
  async compor(u: UsuarioAutenticado, id: string, dto: ComporProvaDto) {
    return this.comporSecoes(u, id, { secoes: [{ titulo: 'Questões', modo: 'FIXA', itens: dto.itens }] });
  }

  /**
   * Composição por seções (lote 8 — ADR-0048). Uma seção FIXA sem nota mínima vira prova sem
   * seções (compatível com o modelo anterior). SORTEIO: o conjunto é o "pool" da seção.
   */
  async comporSecoes(u: UsuarioAutenticado, id: string, dto: ComporSecoesDto) {
    await this.buscarRascunho(u, id);
    const problemas = problemasDasSecoes(dto.secoes);
    if (problemas.length) throw new BadRequestException(problemas.join('; '));
    const todos = dto.secoes.flatMap((s) => s.itens);
    await this.validarVersoes(todos.map((i) => i.versaoQuestaoId));
    const semSecoes = dto.secoes.length === 1 && dto.secoes[0]!.modo === 'FIXA' && dto.secoes[0]!.notaMinima == null;

    await this.prisma.$transaction(async (tx) => {
      await tx.provaQuestao.deleteMany({ where: { provaId: id } });
      await tx.secaoProva.deleteMany({ where: { provaId: id } });
      let ordem = 0;
      for (const [k, s] of dto.secoes.entries()) {
        const secao = semSecoes
          ? null
          : await tx.secaoProva.create({
              data: {
                provaId: id,
                titulo: s.titulo,
                ordem: k + 1,
                modo: s.modo,
                sortear: s.modo === 'SORTEIO' ? s.sortear! : null,
                peso: s.modo === 'SORTEIO' ? s.peso! : null,
                notaMinima: s.notaMinima ?? null,
              },
            });
        await tx.provaQuestao.createMany({
          data: s.itens.map((i) => ({
            provaId: id,
            secaoId: secao?.id ?? null,
            versaoQuestaoId: i.versaoQuestaoId,
            ordem: ++ordem,
            // No sorteio o peso individual é derivado da seção (peso ÷ sortear).
            peso: s.modo === 'SORTEIO' ? Math.round((s.peso! / s.sortear!) * 100) / 100 : i.peso!,
          })),
        });
      }
      await tx.prova.update({ where: { id }, data: { atualizadoEm: new Date() } });
    });
    return this.obter(u, id);
  }

  private async validarVersoes(versaoIds: string[]) {
    const versoes = await this.questoes.versoesCompletas(versaoIds);
    const questoesUsadas = new Set<string>();
    for (const item of versaoIds.map((versaoQuestaoId) => ({ versaoQuestaoId }))) {
      const v = versoes.get(item.versaoQuestaoId);
      if (!v) throw new BadRequestException('Questão não encontrada');
      if (v.statusQuestao !== 'PUBLICADA') {
        throw new BadRequestException('Só questões publicadas podem compor uma prova');
      }
      if (v.pendente) {
        throw new BadRequestException('Esta versão aguarda aprovação e ainda não pode ser usada');
      }
      if (questoesUsadas.has(v.questaoId)) {
        throw new BadRequestException('A mesma questão aparece mais de uma vez');
      }
      questoesUsadas.add(v.questaoId);
    }
  }

  /** Corretores designados (lote 8): havendo designação, só eles corrigem (além do autor e da gestão). */
  async definirCorretores(u: UsuarioAutenticado, id: string, usuarioIds: string[]) {
    await this.buscar(u, id);
    const ids = [...new Set(usuarioIds)];
    for (const uid of ids) {
      const p = await this.usuarios.obterProfissional(uid);
      if (!p || !['CORRETOR', 'PROFESSOR', 'COORDENADOR'].includes(p.papel)) {
        throw new BadRequestException('Corretor inválido');
      }
    }
    await this.prisma.$transaction([
      this.prisma.provaCorretor.deleteMany({ where: { provaId: id, usuarioId: { notIn: ids } } }),
      this.prisma.provaCorretor.createMany({ data: ids.map((usuarioId) => ({ provaId: id, usuarioId })), skipDuplicates: true }),
    ]);
    await this.auditoria.registrar({ usuarioId: u.id, acao: 'PROVA_CORRETORES_DEFINIDOS', recurso: 'prova', recursoId: id, dados: { usuarioIds: ids } });
    return { corretoresIds: ids };
  }

  /**
   * Provas cujas tentativas o usuário pode corrigir (null = todas): gestão vê tudo; professor, as
   * próprias e as em que foi designado; corretor, as sem designação e as em que foi designado.
   */
  async idsCorrigiveis(u: UsuarioAutenticado): Promise<string[] | null> {
    if (ehGestor(u)) return null;
    const designadas = (await this.prisma.provaCorretor.findMany({ where: { usuarioId: u.id }, select: { provaId: true } })).map((d) => d.provaId);
    if (u.papel === 'CORRETOR') {
      const semDesignacao = await this.prisma.prova.findMany({ where: { corretores: { none: {} } }, select: { id: true } });
      return [...new Set([...semDesignacao.map((p) => p.id), ...designadas])];
    }
    const proprias = await this.prisma.prova.findMany({ where: { autorId: u.id }, select: { id: true } });
    return [...new Set([...proprias.map((p) => p.id), ...designadas])];
  }

  /** RF05 passos 3–5: peso total deve fechar 100%; caso contrário a publicação é bloqueada. */
  async publicar(u: UsuarioAutenticado, id: string) {
    const prova = await this.buscarRascunho(u, id);
    if (prova.questoes.length === 0) {
      throw new BadRequestException('Adicione ao menos uma questão antes de publicar');
    }
    const secoes = prova.secoes.map((s) => ({
      modo: s.modo,
      sortear: s.sortear,
      peso: s.peso == null ? null : Number(s.peso),
      itens: prova.questoes.filter((q) => q.secaoId === s.id).map((q) => ({ peso: Number(q.peso) })),
    }));
    const problemas = problemasDasSecoes(secoes);
    if (problemas.length) throw new BadRequestException(problemas.join('; '));
    const soma = somaPesos(
      prova.questoes.filter((q) => !q.secaoId).map((q) => ({ peso: Number(q.peso) })),
      secoes,
    );
    if (Math.abs(soma - 100) > TOLERANCIA_PESO) {
      throw new BadRequestException({
        message: `A soma dos pesos precisa fechar 100% (atual: ${arred(soma)}%)`,
        codigo: 'PESO_INVALIDO',
      });
    }
    await this.prisma.prova.update({
      where: { id },
      data: { status: 'PUBLICADA', publicadaEm: new Date() },
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'PROVA_PUBLICADA',
      recurso: 'prova',
      recursoId: id,
      dados: { questoes: prova.questoes.length },
    });
    return { id, status: 'PUBLICADA' };
  }

  /** Rascunho: troca as versões antigas pelas vigentes das mesmas questões (mantém ordem e pesos). */
  async atualizarVersoes(u: UsuarioAutenticado, id: string) {
    const prova = await this.buscarRascunho(u, id);
    const versoes = await this.questoes.versoesCompletas(prova.questoes.map((q) => q.versaoQuestaoId));
    const vigentes = await this.questoes.versoesVigentes([...versoes.values()].map((v) => v.questaoId));
    let trocadas = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const item of prova.questoes) {
        const v = versoes.get(item.versaoQuestaoId);
        const vigente = v ? vigentes.get(v.questaoId) : undefined;
        if (vigente && vigente.id !== item.versaoQuestaoId && vigente.numeroVersao > v!.numeroVersao) {
          await tx.provaQuestao.update({ where: { id: item.id }, data: { versaoQuestaoId: vigente.id } });
          trocadas++;
        }
      }
    });
    return { ...(await this.obter(u, id)), versoesAtualizadas: trocadas };
  }

  /** Cria um rascunho com os mesmos parâmetros e a mesma composição (mesmas versões). */
  async duplicar(u: UsuarioAutenticado, id: string) {
    const origem = await this.buscar(u, id);
    const copia = await this.prisma.prova.create({
      data: {
        autorId: u.id,
        titulo: `${origem.titulo} (cópia)`.slice(0, 200),
        descricao: origem.descricao,
        visibilidade: origem.visibilidade,
        criterioAprovacao: origem.criterioAprovacao as Prisma.InputJsonValue,
        tempoLimiteMin: origem.tempoLimiteMin,
        tentativasPermitidas: origem.tentativasPermitidas,
        modoNavegacao: origem.modoNavegacao,
        ordemQuestoes: origem.ordemQuestoes,
        exigeMfa: origem.exigeMfa,
        exibirGabarito: origem.exibirGabarito,
        prazoRecursoDias: origem.prazoRecursoDias,
        correcaoAsCegas: origem.correcaoAsCegas,
        correcaoDupla: origem.correcaoDupla,
        limiarDivergencia: origem.limiarDivergencia,
        sugestaoIa: origem.sugestaoIa,
        tempoPorQuestaoSeg: origem.tempoPorQuestaoSeg,
      },
    });
    // Seções e itens (mantém o vínculo item → seção com os novos ids).
    const novaSecao = new Map<string, string>();
    for (const s of origem.secoes) {
      const n = await this.prisma.secaoProva.create({
        data: { provaId: copia.id, titulo: s.titulo, ordem: s.ordem, modo: s.modo, sortear: s.sortear, peso: s.peso, notaMinima: s.notaMinima },
      });
      novaSecao.set(s.id, n.id);
    }
    await this.prisma.provaQuestao.createMany({
      data: origem.questoes.map((q) => ({
        provaId: copia.id,
        secaoId: q.secaoId ? novaSecao.get(q.secaoId)! : null,
        versaoQuestaoId: q.versaoQuestaoId,
        ordem: q.ordem,
        peso: q.peso,
      })),
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'PROVA_DUPLICADA',
      recurso: 'prova',
      recursoId: copia.id,
      dados: { origemId: id },
    });
    return { id: copia.id };
  }

  async arquivar(u: UsuarioAutenticado, id: string) {
    await this.buscar(u, id);
    await this.prisma.prova.update({ where: { id }, data: { status: 'ARQUIVADA' } });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'PROVA_ARQUIVADA',
      recurso: 'prova',
      recursoId: id,
    });
    return { id, status: 'ARQUIVADA' };
  }

  // ------------------------------------------------- usado por outros módulos

  /**
   * null = vê todas (gestão); senão, ids das provas do professor. Corretor: nenhuma (ADR-0021) —
   * a fila de correção dele não passa por aqui, e permissão delegada não amplia o escopo (ADR-0033).
   */
  async idsVisiveis(u: UsuarioAutenticado): Promise<string[] | null> {
    if (ehGestor(u)) return null;
    if (u.papel === 'CORRETOR') return [];
    const provas = await this.prisma.prova.findMany({ where: { autorId: u.id }, select: { id: true } });
    return provas.map((p) => p.id);
  }

  async obterVisivel(u: UsuarioAutenticado, id: string) {
    const { questoes: _, ...prova } = await this.buscar(u, id);
    return prova;
  }

  async autor(provaId: string): Promise<string | null> {
    return (await this.prisma.prova.findUnique({ where: { id: provaId }, select: { autorId: true } }))?.autorId ?? null;
  }

  async resumos(ids: string[]) {
    const provas = await this.prisma.prova.findMany({
      where: { id: { in: [...new Set(ids)] } },
      select: {
        id: true,
        titulo: true,
        descricao: true,
        tempoLimiteMin: true,
        tentativasPermitidas: true,
        modoNavegacao: true,
        exigeMfa: true,
        _count: { select: { questoes: true } },
        questoes: { select: { secaoId: true } },
        secoes: { select: { id: true, modo: true, sortear: true } },
      },
    });
    return new Map(
      provas.map(({ questoes, secoes, ...p }) => [
        p.id,
        {
          ...p,
          /** Questões que cada participante recebe (com sorteio, menos que o conjunto). */
          totalQuestoes: questoesPorParticipante(
            questoes.filter((q) => !q.secaoId).length,
            secoes.map((s) => ({ modo: s.modo, sortear: s.sortear, itens: questoes.filter((q) => q.secaoId === s.id).map(() => ({})) })),
          ),
        },
      ]),
    );
  }

  /** Prova com conteúdo completo, para gerar a instância de um participante. */
  async paraAplicacao(provaId: string): Promise<ProvaParaAplicacao> {
    const prova = await this.prisma.prova.findUnique({
      where: { id: provaId },
      include: incluirComposicao,
    });
    if (!prova) throw new NotFoundException('Prova não encontrada');
    const versoes = await this.questoes.versoesCompletas(prova.questoes.map((q) => q.versaoQuestaoId));
    return {
      id: prova.id,
      autorId: prova.autorId,
      titulo: prova.titulo,
      descricao: prova.descricao,
      visibilidade: prova.visibilidade,
      criterioAprovacao: prova.criterioAprovacao as unknown as CriterioAprovacao,
      tempoLimiteMin: prova.tempoLimiteMin,
      tentativasPermitidas: prova.tentativasPermitidas,
      modoNavegacao: prova.modoNavegacao,
      ordemQuestoes: prova.ordemQuestoes,
      exigeMfa: prova.exigeMfa,
      exibirGabarito: prova.exibirGabarito,
      prazoRecursoDias: prova.prazoRecursoDias,
      correcaoAsCegas: prova.correcaoAsCegas,
      correcaoDupla: prova.correcaoDupla,
      limiarDivergencia: prova.limiarDivergencia,
      tempoPorQuestaoSeg: prova.modoNavegacao === 'SEQUENCIAL' ? prova.tempoPorQuestaoSeg : null,
      secoes: prova.secoes.map(secaoPublica),
      itens: prova.questoes.map((q) => ({
        ordem: q.ordem,
        peso: Number(q.peso),
        secaoId: q.secaoId,
        versao: versoes.get(q.versaoQuestaoId)!,
      })),
    };
  }

  // ---------------------------------------------------------------- apoio

  private async buscar(u: UsuarioAutenticado, id: string) {
    const prova = await this.prisma.prova.findFirst({
      where: { AND: [{ id }, this.visiveis(u)] },
      include: { ...incluirComposicao, corretores: { select: { usuarioId: true } } },
    });
    if (!prova) throw new NotFoundException('Prova não encontrada');
    return prova;
  }

  private async buscarRascunho(u: UsuarioAutenticado, id: string) {
    const prova = await this.buscar(u, id);
    if (prova.status !== 'RASCUNHO') {
      throw new ConflictException('Prova publicada ou arquivada não pode ser alterada');
    }
    return prova;
  }

  private dados(dto: SalvarProvaDto) {
    if (dto.exigeMfa && dto.visibilidade === 'PUBLICA') {
      throw new BadRequestException('Prova pública não tem login: não é possível exigir verificação em duas etapas');
    }
    return {
      titulo: dto.titulo,
      descricao: dto.descricao || null,
      visibilidade: dto.visibilidade,
      criterioAprovacao:
        dto.criterioAprovacao.tipo === 'NOTA_MINIMA'
          ? { tipo: 'NOTA_MINIMA', valor: dto.criterioAprovacao.valor ?? 6 }
          : { tipo: 'NENHUM' },
      tempoLimiteMin: dto.tempoLimiteMin ?? null,
      tentativasPermitidas: dto.tentativasPermitidas,
      modoNavegacao: dto.modoNavegacao,
      ordemQuestoes: dto.ordemQuestoes,
      exigeMfa: dto.exigeMfa ?? false,
      correcaoAsCegas: dto.correcaoAsCegas ?? false,
      exibirGabarito: dto.exibirGabarito ?? 'NUNCA',
      prazoRecursoDias: dto.prazoRecursoDias ?? null,
      correcaoDupla: dto.correcaoDupla ?? false,
      limiarDivergencia: dto.limiarDivergencia ?? 20,
      sugestaoIa: dto.sugestaoIa ?? false,
      // Tempo por questão só faz sentido na navegação sequencial (sem voltar).
      tempoPorQuestaoSeg: dto.modoNavegacao === 'SEQUENCIAL' ? (dto.tempoPorQuestaoSeg ?? null) : null,
    };
  }
}

function arred(n: number) {
  return Math.round(n * 100) / 100;
}
