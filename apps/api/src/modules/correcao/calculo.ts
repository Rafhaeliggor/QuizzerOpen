import type { CriterioAprovacao } from '../provas/provas.service.js';

export type Politica = 'PONTUAR_TODOS' | 'REMOVER_DO_TOTAL';

export interface QuestaoParaCalculo {
  versaoQuestaoId: string;
  /** Seção da prova (lote 8). */
  secaoId?: string | null;
  peso: number;
  /** 0..1; null = aguardando correção manual. */
  fracao: number | null;
}

export interface ResultadoCalculo {
  /** Há questão (não anulada) sem correção — bloqueia a consolidação (RF07). */
  pendente: boolean;
  /** Nota 0–10 considerando pendentes como zero. */
  notaProvisoria: number;
  /** Nota final 0–10 (null enquanto pendente). */
  notaFinal: number | null;
  statusAprovacao: 'APROVADO' | 'REPROVADO' | 'SEM_CRITERIO' | null;
  /** Nota por seção (lote 8); `atingiu` = null sem nota mínima ou enquanto pendente. */
  notasSecao: NotaSecao[];
}

export interface SecaoParaCalculo {
  id: string;
  titulo: string;
  notaMinima: number | null;
}

export interface NotaSecao {
  id: string;
  titulo: string;
  nota: number;
  notaMinima: number | null;
  atingiu: boolean | null;
}

/** Soma ponderada 0–10 de um grupo de questões, com as regras de anulação. */
function notaDoGrupo(questoes: QuestaoParaCalculo[], anulacoes: Map<string, Politica>) {
  let total = 0;
  let obtido = 0;
  let pendente = false;
  for (const q of questoes) {
    const politica = anulacoes.get(q.versaoQuestaoId);
    if (politica === 'REMOVER_DO_TOTAL') continue;
    total += q.peso;
    if (politica === 'PONTUAR_TODOS') {
      obtido += q.peso;
    } else if (q.fracao == null) {
      pendente = true;
    } else {
      obtido += q.peso * q.fracao;
    }
  }
  return { nota: total > 0 ? arredondar((obtido / total) * 10, 2) : 0, pendente };
}

/**
 * Arredonda "meio para cima" em `casas` decimais sem o erro binário do ponto flutuante:
 * 50,25 de 100 pontos é 5,025, mas 0,5025 × 1000 vale 502,4999… em double e `Math.round`
 * dava 5,02 em vez de 5,03. A regra vale para a nota (0–10, duas casas) e para as médias
 * dos relatórios.
 */
export function arredondar(valor: number, casas: number): number {
  const fator = 10 ** casas;
  return Math.round(Number((valor * fator).toPrecision(12))) / fator;
}

/**
 * Nota = Σ(peso × fração) / Σ(peso) × 10, em escala 0–10 com 2 casas.
 * Anulação PONTUAR_TODOS conta a questão como acertada; REMOVER_DO_TOTAL a exclui.
 */
export function calcularNota(
  questoes: QuestaoParaCalculo[],
  anulacoes: Map<string, Politica>,
  criterio: CriterioAprovacao,
  secoes: SecaoParaCalculo[] = [],
): ResultadoCalculo {
  const { nota, pendente } = notaDoGrupo(questoes, anulacoes);
  const notasSecao: NotaSecao[] = secoes.map((s) => {
    const r = notaDoGrupo(questoes.filter((q) => q.secaoId === s.id), anulacoes);
    return {
      id: s.id,
      titulo: s.titulo,
      nota: r.nota,
      notaMinima: s.notaMinima,
      atingiu: s.notaMinima == null || r.pendente ? null : r.nota >= s.notaMinima,
    };
  });
  if (pendente) {
    return { pendente, notaProvisoria: nota, notaFinal: null, statusAprovacao: null, notasSecao };
  }
  // Nota mínima por seção soma-se ao critério geral (RF05 — "por seção/combinação").
  const comMinima = notasSecao.filter((s) => s.notaMinima != null);
  const secoesOk = comMinima.every((s) => s.atingiu);
  const statusAprovacao =
    criterio.tipo === 'NOTA_MINIMA'
      ? nota >= (criterio.valor ?? 0) && secoesOk ? 'APROVADO' : 'REPROVADO'
      : comMinima.length
        ? secoesOk ? 'APROVADO' : 'REPROVADO'
        : 'SEM_CRITERIO';
  return { pendente, notaProvisoria: nota, notaFinal: nota, statusAprovacao, notasSecao };
}

/** Correção automática de questão fechada: 1 se a alternativa marcada é a do gabarito. */
export function corrigirFechada(resposta: unknown, gabarito: unknown): number {
  const marcada = (resposta as { alternativaId?: unknown } | null)?.alternativaId;
  const correta = (gabarito as { alternativaId?: unknown } | null)?.alternativaId;
  return typeof marcada === 'string' && marcada === correta ? 1 : 0;
}

/** Normalização da resposta curta: sem acento, caixa, pontuação nas pontas e espaços extras. */
export function normalizarResposta(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.,;:!?"']+|[.,;:!?"']+$/g, '')
    .trim();
}

/** Resposta curta: 1 se o texto, normalizado, coincide com alguma resposta aceita. */
export function corrigirRespostaCurta(resposta: unknown, gabarito: unknown): number {
  const texto = (resposta as { texto?: unknown } | null)?.texto;
  const aceitas = (gabarito as { respostasAceitas?: unknown } | null)?.respostasAceitas;
  if (typeof texto !== 'string' || !Array.isArray(aceitas)) return 0;
  const dada = normalizarResposta(texto);
  if (!dada) return 0;
  return aceitas.some((a) => typeof a === 'string' && normalizarResposta(a) === dada) ? 1 : 0;
}

/**
 * Várias corretas: (corretas marcadas − incorretas marcadas) / total de corretas, mínimo 0.
 * Marcar tudo não compensa; acertar parte vale parte.
 */
export function corrigirMultiplaResposta(resposta: unknown, gabarito: unknown): number {
  const marcadas = (resposta as { alternativaIds?: unknown } | null)?.alternativaIds;
  const corretas = (gabarito as { alternativaIds?: unknown } | null)?.alternativaIds;
  if (!Array.isArray(marcadas) || !Array.isArray(corretas) || corretas.length === 0) return 0;
  const certas = new Set(corretas);
  let pontos = 0;
  for (const m of new Set(marcadas)) pontos += certas.has(m) ? 1 : -1;
  return Math.max(0, Math.round((pontos / certas.size) * 10_000) / 10_000);
}

/** Lê número escrito à brasileira ou não: "3,14", "3.14", "1.234,5", "-2". null se inválido. */
export function lerNumero(texto: string): number | null {
  let t = texto.trim().replace(/\s/g, '');
  if (!/^[-+]?[\d.,]+$/.test(t)) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if ((t.match(/\./g) ?? []).length > 1) t = t.replace(/\./g, '');
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Resposta numérica: 1 se |resposta − valor| ≤ tolerância. */
export function corrigirNumerica(resposta: unknown, gabarito: unknown): number {
  const texto = (resposta as { texto?: unknown } | null)?.texto;
  const g = gabarito as { valor?: unknown; tolerancia?: unknown } | null;
  if (typeof texto !== 'string' || typeof g?.valor !== 'number') return 0;
  const n = lerNumero(texto);
  if (n === null) return 0;
  const tol = typeof g.tolerancia === 'number' ? g.tolerancia : 0;
  return Math.abs(n - g.valor) <= tol + 1e-9 ? 1 : 0;
}

/** Associação: fração de itens ligados à opção certa. */
export function corrigirAssociacao(resposta: unknown, gabarito: unknown): number {
  const dada = (resposta as { pares?: unknown } | null)?.pares;
  const certa = (gabarito as { pares?: unknown } | null)?.pares;
  if (!certa || typeof certa !== 'object' || !dada || typeof dada !== 'object') return 0;
  const itens = Object.entries(certa as Record<string, string>);
  if (itens.length === 0) return 0;
  const acertos = itens.filter(([i, o]) => (dada as Record<string, unknown>)[i] === o).length;
  return Math.round((acertos / itens.length) * 10_000) / 10_000;
}

/**
 * Ordenação: fração de PARES na ordem relativa certa (tau de Kendall normalizado em 0–1).
 * Inverter só dois vizinhos custa pouco; inverter tudo zera.
 */
export function corrigirOrdenacao(resposta: unknown, gabarito: unknown): number {
  const dada = (resposta as { ordem?: unknown } | null)?.ordem;
  const certa = (gabarito as { ordem?: unknown } | null)?.ordem;
  if (!Array.isArray(dada) || !Array.isArray(certa) || certa.length < 2 || dada.length !== certa.length) return 0;
  const pos = new Map(dada.map((id, i) => [id, i]));
  if (certa.some((id) => !pos.has(id))) return 0;
  let concordantes = 0;
  let total = 0;
  for (let i = 0; i < certa.length; i++) {
    for (let j = i + 1; j < certa.length; j++) {
      total++;
      if (pos.get(certa[i])! < pos.get(certa[j])!) concordantes++;
    }
  }
  return Math.round((concordantes / total) * 10_000) / 10_000;
}

/** Correção automática por formato; null = depende de correção manual (dissertativa respondida). */
export function corrigirAutomaticamente(formato: string, resposta: unknown, gabarito: unknown): number | null {
  switch (formato) {
    case 'MULTIPLA_ESCOLHA':
    case 'VERDADEIRO_FALSO':
      return corrigirFechada(resposta, gabarito);
    case 'RESPOSTA_CURTA':
      return corrigirRespostaCurta(resposta, gabarito);
    case 'MULTIPLA_RESPOSTA':
      return corrigirMultiplaResposta(resposta, gabarito);
    case 'RESPOSTA_NUMERICA':
      return corrigirNumerica(resposta, gabarito);
    case 'ASSOCIACAO':
      return corrigirAssociacao(resposta, gabarito);
    case 'ORDENACAO':
      return corrigirOrdenacao(resposta, gabarito);
    default:
      return respostaAbertaVazia(resposta) ? 0 : null;
  }
}

export type PoliticaGabarito = 'NUNCA' | 'APOS_CORRECAO' | 'APOS_ENCERRAMENTO';

/** RF07: o gabarito só aparece ao aluno com resultado consolidado e conforme a política da prova. */
export function gabaritoVisivel(
  nota: { status: string; exibirGabarito: string; janelaFim: Date | null },
  agora = new Date(),
): boolean {
  if (nota.status !== 'CONSOLIDADA') return false;
  if (nota.exibirGabarito === 'APOS_CORRECAO') return true;
  if (nota.exibirGabarito === 'APOS_ENCERRAMENTO') return !!nota.janelaFim && nota.janelaFim <= agora;
  return false;
}

/** RF08: fim do prazo de recurso (null = sem prazo ou resultado ainda não publicado). */
export function prazoRecursoFim(nota: { prazoRecursoDias: number | null; consolidadaEm: Date | null }): Date | null {
  if (!nota.prazoRecursoDias || !nota.consolidadaEm) return null;
  return new Date(nota.consolidadaEm.getTime() + nota.prazoRecursoDias * 86_400_000);
}

export function respostaAbertaVazia(resposta: unknown): boolean {
  const texto = (resposta as { texto?: unknown } | null)?.texto;
  return typeof texto !== 'string' || texto.trim() === '';
}
