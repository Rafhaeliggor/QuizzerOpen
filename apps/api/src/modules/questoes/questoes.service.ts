import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ehGestor } from '../../common/auth/escopo.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { FormatoQuestao, NaturezaQuestao } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { ListarQuestoesDto, SalvarQuestaoDto } from './dto.js';
import { MidiasService, urlMidia, type MidiaPublica } from './midias.service.js';
import { LIMITE_SIMILARIDADE, similaridade } from './similaridade.js';

export interface Alternativa {
  id: string;
  texto: string;
  /** Associação: ITEM (coluna A) ou OPCAO (coluna B). */
  grupo?: 'ITEM' | 'OPCAO';
}

/** Conteúdo completo de uma versão — usado pela composição de provas e pela aplicação. */
export interface VersaoCompleta {
  id: string;
  questaoId: string;
  numeroVersao: number;
  enunciado: string;
  alternativas: Alternativa[] | null;
  gabarito: Gabarito | null;
  rubrica: Rubrica | null;
  natureza: NaturezaQuestao;
  formato: FormatoQuestao;
  midias: MidiaPublica[];
  pendente: boolean;
  disciplina: string;
  dificuldade: string;
  statusQuestao: string;
}

/** Rubrica da dissertativa: texto livre e, opcionalmente, critérios com pontos (lote 8). */
export interface Rubrica {
  criterios: string;
  itens?: { descricao: string; pontos: number }[];
}

/** Múltipla escolha e V/F: alternativa correta. Resposta curta: respostas aceitas. */
export interface Gabarito {
  alternativaId?: string;
  /** Várias corretas. */
  alternativaIds?: string[];
  respostasAceitas?: string[];
  /** Resposta numérica. */
  valor?: number;
  tolerancia?: number;
  /** Associação: item → opção. */
  pares?: Record<string, string>;
  /** Ordenação: ids na ordem correta. */
  ordem?: string[];
}

const LETRAS = 'ABCDEFGHIJ';

/** Versão vigente = a mais recente APROVADA (versões pendentes de alto risco ficam de fora). */
const incluirVigente = {
  versoes: { where: { pendente: false }, orderBy: { numeroVersao: 'desc' }, take: 1 },
} satisfies Prisma.QuestaoInclude;

export function naturezaDoFormato(formato: FormatoQuestao): NaturezaQuestao {
  return formato === 'DISSERTATIVA' ? 'ABERTA' : 'FECHADA';
}

function mapearMidias(midias: { id: string; tipo: MidiaPublica['tipo']; arquivo: string; nomeOriginal: string }[]) {
  return midias.map((m) => ({ id: m.id, tipo: m.tipo, url: urlMidia(m.arquivo), nomeOriginal: m.nomeOriginal }));
}

/** RF04 — Banco de questões versionado com dupla checagem. */
@Injectable()
export class QuestoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly usuarios: UsuariosService,
    private readonly midias: MidiasService,
  ) {}

  // ---------------------------------------------------------------- consulta

  /** Professor vê as próprias questões, as publicadas e as que aguardam revisão. */
  private visiveis(u: UsuarioAutenticado): Prisma.QuestaoWhereInput {
    if (ehGestor(u)) return {};
    return {
      OR: [{ autorId: u.id }, { statusAtual: { in: ['PUBLICADA', 'EM_REVISAO'] } }],
    };
  }

  async listar(u: UsuarioAutenticado, f: ListarQuestoesDto) {
    const escopo: Prisma.QuestaoWhereInput =
      f.escopo === 'minhas'
        ? { autorId: u.id }
        : f.escopo === 'revisao'
          ? {
              OR: [
                { statusAtual: 'EM_REVISAO', autorId: { not: u.id } },
                { autorId: { not: u.id }, versoes: { some: { pendente: true, criadoPorId: { not: u.id } } } },
              ],
            }
          : f.escopo === 'publicadas'
            ? { statusAtual: 'PUBLICADA' }
            : {};
    const where: Prisma.QuestaoWhereInput = {
      AND: [
        this.visiveis(u),
        escopo,
        f.status ? { statusAtual: f.status } : {},
        f.natureza ? { natureza: f.natureza } : {},
        f.formato ? { formato: f.formato } : {},
        f.dificuldade ? { dificuldade: f.dificuldade } : {},
        f.disciplina ? { disciplina: { equals: f.disciplina, mode: 'insensitive' } } : {},
        f.busca
          ? {
              versoes: {
                some: { enunciado: { contains: f.busca, mode: 'insensitive' } },
              },
            }
          : {},
      ],
    };
    const [total, itens] = await this.prisma.$transaction([
      this.prisma.questao.count({ where }),
      this.prisma.questao.findMany({
        where,
        include: { ...incluirVigente, _count: { select: { versoes: { where: { pendente: true } } } } },
        orderBy: { atualizadoEm: 'desc' },
        skip: (f.pagina - 1) * f.tamanho,
        take: f.tamanho,
      }),
    ]);
    const autores = await this.usuarios.resumos(itens.map((q) => q.autorId));
    return {
      total,
      pagina: f.pagina,
      tamanho: f.tamanho,
      itens: itens.map((q) => {
        const v = q.versoes[0]!;
        return {
          id: q.id,
          disciplina: q.disciplina,
          topico: q.topico,
          dificuldade: q.dificuldade,
          natureza: q.natureza,
          formato: q.formato,
          altoRisco: q.altoRisco,
          versaoPendente: q._count.versoes > 0,
          statusAtual: q.statusAtual,
          autorId: q.autorId,
          autorNome: autores.get(q.autorId)?.nome ?? '—',
          atualizadoEm: q.atualizadoEm,
          versaoVigente: { id: v.id, numeroVersao: v.numeroVersao, enunciado: v.enunciado },
        };
      }),
    };
  }

  async disciplinas(u: UsuarioAutenticado): Promise<string[]> {
    const linhas = await this.prisma.questao.findMany({
      where: this.visiveis(u),
      distinct: ['disciplina'],
      select: { disciplina: true },
      orderBy: { disciplina: 'asc' },
    });
    return linhas.map((l) => l.disciplina);
  }

  async obter(u: UsuarioAutenticado, id: string) {
    const q = await this.prisma.questao.findFirst({
      where: { AND: [{ id }, this.visiveis(u)] },
      include: { versoes: { orderBy: { numeroVersao: 'desc' }, include: { midias: { orderBy: { criadoEm: 'asc' } } } } },
    });
    if (!q) throw new NotFoundException('Questão não encontrada');
    const pessoas = await this.usuarios.resumos(
      [q.autorId, q.revisadoPorId, ...q.versoes.map((v) => v.criadoPorId)].filter((x): x is string => !!x),
    );
    const pendente = q.versoes.find((v) => v.pendente) ?? null;
    return {
      ...q,
      versoes: q.versoes.map((v) => ({
        ...v,
        midias: mapearMidias(v.midias),
        criadoPorNome: pessoas.get(v.criadoPorId)?.nome ?? '—',
      })),
      autorNome: pessoas.get(q.autorId)?.nome ?? '—',
      revisadoPorNome: q.revisadoPorId ? (pessoas.get(q.revisadoPorId)?.nome ?? '—') : null,
      podeEditar: this.podeAlterar(u, q.autorId) && ['RASCUNHO', 'PUBLICADA'].includes(q.statusAtual),
      podeRevisar: q.statusAtual === 'EM_REVISAO' && q.autorId !== u.id,
      versaoPendenteId: pendente?.id ?? null,
      podeAprovarVersao: !!pendente && pendente.criadoPorId !== u.id && q.autorId !== u.id,
      podeMarcarAltoRisco: !q.publicadaEm || ehGestor(u),
    };
  }

  // ---------------------------------------------------------------- escrita

  async criar(u: UsuarioAutenticado, dto: SalvarQuestaoDto) {
    const formato = this.formato(dto);
    const conteudo = this.validarConteudo(dto, formato);
    const id = await this.prisma.$transaction(async (tx) => {
      const q = await tx.questao.create({
        data: {
          autorId: u.id,
          disciplina: dto.disciplina,
          topico: dto.topico || null,
          dificuldade: dto.dificuldade,
          natureza: naturezaDoFormato(formato),
          formato,
          altoRisco: dto.altoRisco ?? false,
          versoes: { create: { numeroVersao: 1, criadoPorId: u.id, ...conteudo } },
        },
        include: { versoes: true },
      });
      await this.midias.definirDaVersao(u, q.id, q.versoes[0]!.id, dto.midiaIds ?? [], tx);
      return q.id;
    });
    return { id };
  }

  /**
   * Rascunho nunca publicado: edita a versão atual no lugar.
   * Questão publicada: gera NOVA versão (a anterior fica preservada para as provas que a usam).
   * Questão publicada de ALTO RISCO: a nova versão fica PENDENTE até outra pessoa aprovar;
   * enquanto isso as provas continuam usando a versão aprovada (RF04).
   */
  async editar(u: UsuarioAutenticado, id: string, dto: SalvarQuestaoDto) {
    const q = await this.buscarParaAlterar(u, id);
    if (!['RASCUNHO', 'PUBLICADA'].includes(q.statusAtual)) {
      throw new ConflictException('Questão em revisão ou arquivada não pode ser editada');
    }
    const formato = this.formato(dto);
    if (q.publicadaEm && formato !== q.formato) {
      throw new BadRequestException('O formato de uma questão já publicada não pode mudar');
    }
    const altoRisco = dto.altoRisco ?? q.altoRisco;
    if (q.publicadaEm && altoRisco !== q.altoRisco && !ehGestor(u)) {
      throw new ForbiddenException('Só a coordenação muda a marcação de alto risco de questão publicada');
    }
    const conteudo = this.validarConteudo(dto, formato);
    const atual = q.versoes[0]!;
    const exigeAprovacao = !!q.publicadaEm && q.altoRisco;
    const pendenteAtual = exigeAprovacao
      ? await this.prisma.versaoQuestao.findFirst({ where: { questaoId: id, pendente: true } })
      : null;
    const ultima = await this.prisma.versaoQuestao.aggregate({ where: { questaoId: id }, _max: { numeroVersao: true } });
    const proxima = (ultima._max.numeroVersao ?? atual.numeroVersao) + 1;

    const versaoId = await this.prisma.$transaction(async (tx) => {
      await tx.questao.update({
        where: { id },
        data: {
          disciplina: dto.disciplina,
          topico: dto.topico || null,
          dificuldade: dto.dificuldade,
          natureza: naturezaDoFormato(formato),
          formato,
          altoRisco,
        },
      });
      let alvo: string;
      if (pendenteAtual) {
        // Já existe uma versão aguardando aprovação: ela é atualizada (não empilha pendências).
        await tx.versaoQuestao.update({ where: { id: pendenteAtual.id }, data: { ...conteudo, criadoPorId: u.id } });
        alvo = pendenteAtual.id;
      } else if (q.publicadaEm) {
        const nova = await tx.versaoQuestao.create({
          data: { questaoId: id, numeroVersao: proxima, criadoPorId: u.id, pendente: exigeAprovacao, ...conteudo },
        });
        alvo = nova.id;
      } else {
        await tx.versaoQuestao.update({ where: { id: atual.id }, data: conteudo });
        alvo = atual.id;
      }
      await this.midias.definirDaVersao(u, id, alvo, dto.midiaIds ?? [], tx);
      return alvo;
    });

    if (q.publicadaEm) {
      await this.auditoria.registrar({
        usuarioId: u.id,
        acao: exigeAprovacao ? 'QUESTAO_VERSAO_PENDENTE' : 'QUESTAO_NOVA_VERSAO',
        recurso: 'questao',
        recursoId: id,
        dados: { versaoId, versao: pendenteAtual?.numeroVersao ?? proxima },
      });
    }
    return { id, versaoPendente: exigeAprovacao };
  }

  /** Aprova a versão pendente de questão de alto risco: passa a ser a vigente. */
  async aprovarVersao(u: UsuarioAutenticado, id: string, versaoId: string) {
    const v = await this.buscarVersaoPendente(u, id, versaoId);
    await this.prisma.$transaction([
      this.prisma.versaoQuestao.update({ where: { id: v.id }, data: { pendente: false } }),
      this.prisma.questao.update({ where: { id }, data: { revisadoPorId: u.id, comentarioRevisao: null } }),
    ]);
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'QUESTAO_VERSAO_APROVADA',
      recurso: 'questao',
      recursoId: id,
      dados: { versaoId, versao: v.numeroVersao },
    });
    return { id, versaoId };
  }

  /** Recusa a versão pendente: ela é descartada e a vigente continua a mesma. */
  async rejeitarVersao(u: UsuarioAutenticado, id: string, versaoId: string, comentario: string) {
    const v = await this.buscarVersaoPendente(u, id, versaoId);
    await this.prisma.$transaction([
      this.prisma.midia.deleteMany({ where: { versaoQuestaoId: v.id } }),
      this.prisma.versaoQuestao.delete({ where: { id: v.id } }),
      this.prisma.questao.update({ where: { id }, data: { revisadoPorId: u.id, comentarioRevisao: comentario } }),
    ]);
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'QUESTAO_VERSAO_RECUSADA',
      recurso: 'questao',
      recursoId: id,
      justificativa: comentario,
      dados: { versao: v.numeroVersao },
    });
    return { id };
  }

  async enviarRevisao(u: UsuarioAutenticado, id: string, confirmarDuplicidade = false) {
    const q = await this.buscarParaAlterar(u, id);
    if (q.statusAtual !== 'RASCUNHO') {
      throw new ConflictException('Só rascunhos podem ser enviados para revisão');
    }

    if (!confirmarDuplicidade) {
      const similares = await this.buscarSimilares(id, q.disciplina, q.versoes[0]!.enunciado);
      if (similares.length > 0) {
        throw new ConflictException({
          message: 'Encontramos questões muito parecidas. Confirme se não é duplicidade.',
          codigo: 'POSSIVEL_DUPLICIDADE',
          similares,
        });
      }
    }

    await this.prisma.questao.update({
      where: { id },
      data: { statusAtual: 'EM_REVISAO', comentarioRevisao: null },
    });
    return { id, statusAtual: 'EM_REVISAO' };
  }

  /** Dupla checagem: o validador precisa ser diferente do autor (RF04, passos 6–7). */
  async aprovar(u: UsuarioAutenticado, id: string) {
    const q = await this.buscarEmRevisao(u, id);
    await this.prisma.questao.update({
      where: { id },
      data: {
        statusAtual: 'PUBLICADA',
        publicadaEm: q.publicadaEm ?? new Date(),
        revisadoPorId: u.id,
        comentarioRevisao: null,
      },
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'QUESTAO_PUBLICADA',
      recurso: 'questao',
      recursoId: id,
    });
    return { id, statusAtual: 'PUBLICADA' };
  }

  async rejeitar(u: UsuarioAutenticado, id: string, comentario: string) {
    await this.buscarEmRevisao(u, id);
    await this.prisma.questao.update({
      where: { id },
      data: { statusAtual: 'RASCUNHO', revisadoPorId: u.id, comentarioRevisao: comentario },
    });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'QUESTAO_REJEITADA',
      recurso: 'questao',
      recursoId: id,
      justificativa: comentario,
    });
    return { id, statusAtual: 'RASCUNHO' };
  }

  async arquivar(u: UsuarioAutenticado, id: string) {
    const q = await this.buscarParaAlterar(u, id);
    if (q.statusAtual === 'ARQUIVADA') return { id, statusAtual: 'ARQUIVADA' };
    await this.prisma.questao.update({ where: { id }, data: { statusAtual: 'ARQUIVADA' } });
    await this.auditoria.registrar({
      usuarioId: u.id,
      acao: 'QUESTAO_ARQUIVADA',
      recurso: 'questao',
      recursoId: id,
    });
    return { id, statusAtual: 'ARQUIVADA' };
  }

  // ------------------------------------------------- usado por outros módulos

  /** Versões com conteúdo completo (inclui gabarito — nunca enviar ao aluno). */
  async versoesCompletas(versaoIds: string[]): Promise<Map<string, VersaoCompleta>> {
    const ids = [...new Set(versaoIds)];
    if (ids.length === 0) return new Map();
    const versoes = await this.prisma.versaoQuestao.findMany({
      where: { id: { in: ids } },
      include: { questao: true, midias: { orderBy: { criadoEm: 'asc' } } },
    });
    return new Map(
      versoes.map((v) => [
        v.id,
        {
          id: v.id,
          questaoId: v.questaoId,
          numeroVersao: v.numeroVersao,
          enunciado: v.enunciado,
          alternativas: v.alternativas as Alternativa[] | null,
          gabarito: v.gabarito as Gabarito | null,
          rubrica: v.rubrica as Rubrica | null,
          natureza: v.questao.natureza,
          formato: v.questao.formato,
          midias: mapearMidias(v.midias),
          pendente: v.pendente,
          disciplina: v.questao.disciplina,
          dificuldade: v.questao.dificuldade,
          statusQuestao: v.questao.statusAtual,
        },
      ]),
    );
  }

  /** questaoId → id da versão vigente (mais recente aprovada) das questões publicadas. */
  async versoesVigentes(questaoIds: string[]): Promise<Map<string, { id: string; numeroVersao: number }>> {
    const ids = [...new Set(questaoIds)];
    if (ids.length === 0) return new Map();
    const qs = await this.prisma.questao.findMany({
      where: { id: { in: ids }, statusAtual: 'PUBLICADA' },
      include: incluirVigente,
    });
    return new Map(qs.filter((q) => q.versoes[0]).map((q) => [q.id, { id: q.versoes[0]!.id, numeroVersao: q.versoes[0]!.numeroVersao }]));
  }

  // ---------------------------------------------------------------- apoio

  private podeAlterar(u: UsuarioAutenticado, autorId: string) {
    return autorId === u.id || ehGestor(u);
  }

  private async buscarParaAlterar(u: UsuarioAutenticado, id: string) {
    const q = await this.prisma.questao.findFirst({
      where: { AND: [{ id }, this.visiveis(u)] },
      include: incluirVigente,
    });
    if (!q) throw new NotFoundException('Questão não encontrada');
    if (!this.podeAlterar(u, q.autorId)) {
      throw new ForbiddenException('Somente o autor ou a coordenação podem alterar esta questão');
    }
    return q;
  }

  private async buscarEmRevisao(u: UsuarioAutenticado, id: string) {
    const q = await this.prisma.questao.findFirst({ where: { AND: [{ id }, this.visiveis(u)] } });
    if (!q) throw new NotFoundException('Questão não encontrada');
    if (q.statusAtual !== 'EM_REVISAO') throw new ConflictException('A questão não está em revisão');
    if (q.autorId === u.id) {
      throw new ForbiddenException('A revisão deve ser feita por outra pessoa (dupla checagem)');
    }
    return q;
  }

  private async buscarVersaoPendente(u: UsuarioAutenticado, id: string, versaoId: string) {
    const q = await this.prisma.questao.findFirst({ where: { AND: [{ id }, this.visiveis(u)] } });
    if (!q) throw new NotFoundException('Questão não encontrada');
    const v = await this.prisma.versaoQuestao.findFirst({ where: { id: versaoId, questaoId: id, pendente: true } });
    if (!v) throw new NotFoundException('Não há versão aguardando aprovação');
    if (v.criadoPorId === u.id || q.autorId === u.id) {
      throw new ForbiddenException('A aprovação deve ser feita por outra pessoa (dupla checagem)');
    }
    return v;
  }

  private formato(dto: SalvarQuestaoDto): FormatoQuestao {
    if (dto.formato) {
      if (dto.natureza && dto.natureza !== naturezaDoFormato(dto.formato)) {
        throw new BadRequestException('Natureza incompatível com o formato');
      }
      return dto.formato;
    }
    if (!dto.natureza) throw new BadRequestException('Informe o formato da questão');
    return dto.natureza === 'ABERTA' ? 'DISSERTATIVA' : 'MULTIPLA_ESCOLHA';
  }

  private async buscarSimilares(id: string, disciplina: string, enunciado: string) {
    const candidatas = await this.prisma.questao.findMany({
      where: {
        id: { not: id },
        disciplina: { equals: disciplina, mode: 'insensitive' },
        statusAtual: { not: 'ARQUIVADA' },
      },
      include: incluirVigente,
      take: 1000,
    });
    return candidatas
      .map((c) => ({
        id: c.id,
        enunciado: c.versoes[0]!.enunciado.slice(0, 200),
        similaridade: Math.round(similaridade(enunciado, c.versoes[0]!.enunciado) * 100) / 100,
      }))
      .filter((c) => c.similaridade >= LIMITE_SIMILARIDADE)
      .sort((a, b) => b.similaridade - a.similaridade)
      .slice(0, 5);
  }

  private validarConteudo(dto: SalvarQuestaoDto, formato: FormatoQuestao) {
    const base = { enunciado: dto.enunciado, rubrica: Prisma.DbNull };
    switch (formato) {
      case 'MULTIPLA_ESCOLHA': {
        const alts = dto.alternativas ?? [];
        if (alts.length < 2) {
          throw new BadRequestException('Questão de múltipla escolha precisa de pelo menos 2 alternativas');
        }
        if (dto.alternativaCorreta == null || dto.alternativaCorreta >= alts.length) {
          throw new BadRequestException('Indique a alternativa correta');
        }
        return {
          ...base,
          alternativas: alts.map((a, i) => ({ id: LETRAS[i]!, texto: a.texto })),
          gabarito: { alternativaId: LETRAS[dto.alternativaCorreta]! },
        };
      }
      case 'MULTIPLA_RESPOSTA': {
        const alts = dto.alternativas ?? [];
        if (alts.length < 2) throw new BadRequestException('A questão precisa de pelo menos 2 alternativas');
        const corretas = [...new Set(dto.alternativasCorretas ?? [])].sort((a, b) => a - b);
        if (corretas.length === 0 || corretas.some((i) => i >= alts.length)) {
          throw new BadRequestException('Marque ao menos uma alternativa correta');
        }
        return {
          ...base,
          alternativas: alts.map((a, i) => ({ id: LETRAS[i]!, texto: a.texto })),
          gabarito: { alternativaIds: corretas.map((i) => LETRAS[i]!) },
        };
      }
      case 'RESPOSTA_NUMERICA':
        if (dto.valorNumerico == null) throw new BadRequestException('Informe o valor numérico esperado');
        return {
          ...base,
          alternativas: Prisma.DbNull,
          gabarito: { valor: dto.valorNumerico, tolerancia: dto.tolerancia ?? 0 },
        };
      case 'ASSOCIACAO': {
        const pares = dto.associacoes ?? [];
        if (pares.length < 2) throw new BadRequestException('Informe ao menos 2 pares para associar');
        const opcoes = [...pares.map((p) => p.opcao), ...(dto.opcoesExtras ?? [])];
        if (new Set(opcoes.map((o) => o.toLowerCase())).size !== opcoes.length) {
          throw new BadRequestException('As opções da coluna B precisam ser diferentes entre si');
        }
        return {
          ...base,
          alternativas: [
            ...pares.map((p, i) => ({ id: `I${i + 1}`, texto: p.item, grupo: 'ITEM' })),
            ...opcoes.map((o, i) => ({ id: `O${i + 1}`, texto: o, grupo: 'OPCAO' })),
          ],
          gabarito: { pares: Object.fromEntries(pares.map((_, i) => [`I${i + 1}`, `O${i + 1}`])) },
        };
      }
      case 'ORDENACAO': {
        const itens = dto.itensOrdem ?? [];
        if (itens.length < 2) throw new BadRequestException('Informe ao menos 2 itens para ordenar');
        return {
          ...base,
          alternativas: itens.map((texto, i) => ({ id: LETRAS[i]!, texto })),
          gabarito: { ordem: itens.map((_, i) => LETRAS[i]!) },
        };
      }
      case 'VERDADEIRO_FALSO':
        if (dto.alternativaCorreta !== 0 && dto.alternativaCorreta !== 1) {
          throw new BadRequestException('Indique se a afirmação é verdadeira ou falsa');
        }
        return {
          ...base,
          alternativas: [
            { id: 'V', texto: 'Verdadeiro' },
            { id: 'F', texto: 'Falso' },
          ],
          gabarito: { alternativaId: dto.alternativaCorreta === 0 ? 'V' : 'F' },
        };
      case 'RESPOSTA_CURTA': {
        const aceitas = [...new Set((dto.respostasAceitas ?? []).map((r) => r.trim()).filter(Boolean))];
        if (aceitas.length === 0) throw new BadRequestException('Informe ao menos uma resposta aceita');
        return { ...base, alternativas: Prisma.DbNull, gabarito: { respostasAceitas: aceitas } };
      }
      case 'DISSERTATIVA':
        if (dto.alternativas?.length) throw new BadRequestException('Questão dissertativa não tem alternativas');
        return {
          enunciado: dto.enunciado,
          alternativas: Prisma.DbNull,
          gabarito: Prisma.DbNull,
          rubrica: {
            criterios: dto.rubrica ?? '',
            ...(dto.rubricaItens?.length ? { itens: dto.rubricaItens.map((i) => ({ descricao: i.descricao, pontos: i.pontos })) } : {}),
          },
        };
    }
  }
}
