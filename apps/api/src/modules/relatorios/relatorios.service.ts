import { Injectable, NotFoundException } from '@nestjs/common';
import { escreverCsv } from '../../common/csv/csv.js';
import { gerarXlsx, type Celula } from '../../common/xlsx/xlsx.js';
import { ExecucaoService } from '../aplicacao/execucao.service.js';
import type { UsuarioAutenticado } from '../../common/auth/tipos.js';
import { CorrecaoService } from '../correcao/correcao.service.js';
import { ProvasService } from '../provas/provas.service.js';
import { TurmasService } from '../turmas/turmas.service.js';
import {
  indicios,
  linhaParticipante,
  porDisciplina,
  porQuestao,
  resumo,
  chaveAnulacao,
  ultimasTentativas,
  type NotaRelatorio,
} from './agregacao.js';
import { arredondar } from '../correcao/calculo.js';

/** Período pelo envio da tentativa: [de, ate). */
export interface Periodo {
  de?: Date;
  ate?: Date;
}

const ROTULO_STATUS: Record<string, string> = {
  CONSOLIDADA: 'Consolidada',
  PENDENTE_CORRECAO_MANUAL: 'Pendente de correção',
};
const ROTULO_APROVACAO: Record<string, string> = {
  APROVADO: 'Aprovado',
  REPROVADO: 'Reprovado',
  SEM_CRITERIO: 'Sem critério',
};

/** RF09 — Relatórios de desempenho. Considera a última tentativa de cada participante. */
@Injectable()
export class RelatoriosService {
  constructor(
    private readonly correcao: CorrecaoService,
    private readonly provas: ProvasService,
    private readonly turmas: TurmasService,
    private readonly execucao: ExecucaoService,
  ) {}

  async resumoProvas(u: UsuarioAutenticado, periodo: Periodo = {}) {
    const notas = ultimasTentativas(
      (await this.correcao.notasParaRelatorio({ provaIds: await this.provas.idsVisiveis(u), ...periodo })) as NotaRelatorio[],
    );
    const porProva = new Map<string, NotaRelatorio[]>();
    for (const n of notas) porProva.set(n.provaId, [...(porProva.get(n.provaId) ?? []), n]);
    return [...porProva.entries()].map(([provaId, lista]) => ({
      provaId,
      provaTitulo: lista[0]!.provaTitulo,
      ...resumo(lista),
    }));
  }

  async prova(u: UsuarioAutenticado, provaId: string, filtro: { aplicacaoId?: string; turmaId?: string } & Periodo) {
    const prova = await this.provas.obterVisivel(u, provaId);
    const notas = ultimasTentativas(
      (await this.correcao.notasParaRelatorio({ provaId, ...filtro, detalhado: true })) as NotaRelatorio[],
    );
    const anuladas = new Set((await this.correcao.anulacoesDe(provaId)).keys());
    return {
      provaId,
      provaTitulo: prova.titulo,
      resumo: resumo(notas),
      questoes: porQuestao(notas, anuladas),
      disciplinas: porDisciplina(notas, new Set([...anuladas].map((v) => chaveAnulacao(provaId, v)))),
      participantes: notas.map(linhaParticipante).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      indicios: indicios(notas, await this.execucao.sinais(notas.map((n) => n.tentativaId!).filter(Boolean))),
    };
  }

  /** Mesma tabela em CSV ou Excel (ADR-0044). */
  async exportarProva(
    u: UsuarioAutenticado,
    provaId: string,
    filtro: { aplicacaoId?: string; turmaId?: string } & Periodo,
    formato: 'csv' | 'xlsx',
  ) {
    const r = await this.prova(u, provaId, filtro);
    return exportar(`relatorio-${slug(r.provaTitulo)}`, r.provaTitulo, formato,
        ['Nome', 'E-mail', 'Tentativa', 'Situação', 'Nota', 'Resultado', 'Duração (min)', 'Envio', 'Certificado'],
        r.participantes.map((p) => [
          p.nome,
          p.email,
          p.tentativa,
          ROTULO_STATUS[p.status] ?? p.status,
          p.nota,
          p.statusAprovacao ? (ROTULO_APROVACAO[p.statusAprovacao] ?? p.statusAprovacao) : '',
          p.duracaoMin,
          p.fimEm.toISOString(),
          p.certificado ? 'Sim' : 'Não',
        ]),
    );
  }

  /** Desempenho por aluno numa turma (média das últimas tentativas consolidadas). */
  async turma(u: UsuarioAutenticado, turmaId: string, periodo: Periodo = {}) {
    const turma = await this.turmas.obter(u, turmaId);
    const notas = ultimasTentativas(
      (await this.correcao.notasParaRelatorio({ turmaId, ...periodo })) as NotaRelatorio[],
    );
    const provas = [...new Map(notas.map((n) => [n.provaId, n.provaTitulo])).entries()].map(([id, titulo]) => ({ id, titulo }));
    const alunos = turma.alunos.map((a) => {
      const minhas = notas.filter((n) => n.usuarioId === a.id);
      const consolidadas = minhas.filter((n) => n.status === 'CONSOLIDADA').map((n) => Number(n.notaFinal));
      return {
        alunoId: a.id,
        nome: a.nome,
        email: a.email,
        matricula: a.matricula,
        provasRealizadas: minhas.length,
        media: consolidadas.length
          ? arredondar(consolidadas.reduce((s, v) => s + v, 0) / consolidadas.length, 2)
          : null,
        notas: Object.fromEntries(
          minhas.map((n) => [n.provaId, n.status === 'CONSOLIDADA' ? Number(n.notaFinal) : null]),
        ),
      };
    });
    return {
      turmaId,
      turmaNome: turma.nome,
      provas,
      alunos,
      resumo: resumo(notas),
      disciplinas: porDisciplina(notas, await this.anuladas(provas.map((p) => p.id))),
    };
  }

  async exportarTurma(u: UsuarioAutenticado, turmaId: string, periodo: Periodo, formato: 'csv' | 'xlsx') {
    const r = await this.turma(u, turmaId, periodo);
    return exportar(`turma-${slug(r.turmaNome)}`, r.turmaNome, formato,
      ['Nome', 'E-mail', 'Matrícula', ...r.provas.map((p) => p.titulo), 'Média'],
      r.alunos.map((a) => [a.nome, a.email, a.matricula, ...r.provas.map((p) => a.notas[p.id] ?? null), a.media]),
    );
  }

  /**
   * Página do aluno (RF09): todas as provas dele dentro do que o usuário pode ver,
   * com evolução no tempo e desempenho por disciplina.
   */
  async aluno(u: UsuarioAutenticado, alunoId: string, periodo: Periodo = {}) {
    const notas = ultimasTentativas(
      (await this.correcao.notasParaRelatorio({
        provaIds: await this.provas.idsVisiveis(u),
        usuarioId: alunoId,
        ...periodo,
      })) as NotaRelatorio[],
    ).sort((a, b) => a.fimEm.getTime() - b.fimEm.getTime());
    if (notas.length === 0 && !(await this.turmas.alunoVisivel(u, alunoId))) {
      throw new NotFoundException('Aluno não encontrado nas suas turmas e provas');
    }
    const consolidadas = notas.filter((n) => n.status === 'CONSOLIDADA');
    return {
      alunoId,
      nome: notas.at(-1)?.participanteNome ?? (await this.turmas.nomeAluno(alunoId)) ?? '—',
      resumo: resumo(notas),
      media: consolidadas.length
        ? arredondar(consolidadas.reduce((s, n) => s + Number(n.notaFinal), 0) / consolidadas.length, 2)
        : null,
      provas: notas.map((n) => ({ ...linhaParticipante(n), provaId: n.provaId, provaTitulo: n.provaTitulo })),
      disciplinas: porDisciplina(notas, await this.anuladas([...new Set(notas.map((n) => n.provaId))])),
    };
  }

  /** Desempenho por disciplina em todas as provas visíveis (ou de uma turma), no período. */
  async disciplinas(u: UsuarioAutenticado, filtro: { turmaId?: string } & Periodo) {
    if (filtro.turmaId) await this.turmas.obterVisivel(u, filtro.turmaId);
    const notas = ultimasTentativas(
      (await this.correcao.notasParaRelatorio({ provaIds: await this.provas.idsVisiveis(u), ...filtro })) as NotaRelatorio[],
    );
    return {
      participantes: notas.length,
      disciplinas: porDisciplina(notas, await this.anuladas([...new Set(notas.map((n) => n.provaId))])),
    };
  }

  /** Anulações de várias provas numa consulta só, como chaves `provaId|versaoQuestaoId`. */
  private async anuladas(provaIds: string[]) {
    return new Set((await this.correcao.anulacoesDasProvas(provaIds)).map((a) => chaveAnulacao(a.provaId, a.versaoQuestaoId)));
  }
}

function exportar(base: string, aba: string, formato: 'csv' | 'xlsx', cabecalho: string[], linhas: Celula[][]) {
  return formato === 'xlsx'
    ? {
        nome: `${base}.xlsx`,
        tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        conteudo: gerarXlsx(aba, cabecalho, linhas),
      }
    : { nome: `${base}.csv`, tipo: 'text/csv; charset=utf-8', conteudo: escreverCsv(cabecalho, linhas) };
}

export function slug(texto: string) {
  return (
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'relatorio'
  );
}
