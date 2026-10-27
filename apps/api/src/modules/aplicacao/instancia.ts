import { randomBytes, randomInt } from 'node:crypto';
import type { MidiaPublica } from '../questoes/midias.service.js';
import type { Alternativa } from '../questoes/questoes.service.js';
import type { ProvaParaAplicacao } from '../provas/provas.service.js';

/** Questão como o participante a vê (sem gabarito). */
export interface QuestaoFixada {
  versaoQuestaoId: string;
  ordem: number;
  peso: number;
  natureza: 'FECHADA' | 'ABERTA';
  /** Instâncias anteriores ao lote 6 não têm: use `formatoDe()`. */
  formato?: Formato;
  disciplina?: string;
  enunciado: string;
  alternativas: Alternativa[] | null;
  midias?: MidiaPublica[];
  /** Seção da prova (lote 8). */
  secaoId?: string;
  secaoTitulo?: string;
}

export type Formato =
  | 'MULTIPLA_ESCOLHA'
  | 'VERDADEIRO_FALSO'
  | 'RESPOSTA_CURTA'
  | 'DISSERTATIVA'
  | 'MULTIPLA_RESPOSTA'
  | 'RESPOSTA_NUMERICA'
  | 'ASSOCIACAO'
  | 'ORDENACAO';

export function formatoDe(q: { natureza: string; formato?: string | null }): Formato {
  return (q.formato as Formato | undefined) ?? (q.natureza === 'ABERTA' ? 'DISSERTATIVA' : 'MULTIPLA_ESCOLHA');
}

export type GabaritoCongelado = Record<string, { gabarito: unknown; rubrica: unknown; midias?: unknown }>;

export type Embaralhar = <T>(itens: T[]) => T[];

/** Fisher–Yates com gerador criptográfico. */
export const embaralharSeguro: Embaralhar = (itens) => {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
};

/**
 * RF06 passo 3: congela a versão da prova para um participante — ordem das questões
 * e das alternativas (quando a prova é randomizada), conteúdo e gabarito. A instância
 * é reconstituível para auditoria e não muda mesmo que as questões ganhem novas versões.
 */
type ItemProva = ProvaParaAplicacao['itens'][number];

/**
 * Lote 8 (ADR-0048): com seções, a ordem segue as seções; FIXA usa todas as questões da seção
 * (embaralhadas se a prova for randomizada) e SORTEIO sorteia `sortear` do conjunto para cada
 * participante, com o peso da seção dividido igualmente entre as sorteadas.
 */
export function selecionarItens(prova: ProvaParaAplicacao, embaralhar: Embaralhar = embaralharSeguro) {
  const randomizada = prova.ordemQuestoes === 'RANDOMIZADA';
  const porOrdem = (a: ItemProva, b: ItemProva) => a.ordem - b.ordem;
  if (!prova.secoes?.length) {
    const itens = randomizada ? embaralhar(prova.itens) : [...prova.itens].sort(porOrdem);
    return itens.map((item) => ({ item, peso: item.peso, secao: null as null | { id: string; titulo: string } }));
  }
  const semSecao = prova.itens.filter((i) => !i.secaoId).sort(porOrdem);
  const selecionados = semSecao.map((item) => ({ item, peso: item.peso, secao: null as null | { id: string; titulo: string } }));
  for (const secao of [...prova.secoes].sort((a, b) => a.ordem - b.ordem)) {
    const daSecao = prova.itens.filter((i) => i.secaoId === secao.id).sort(porOrdem);
    const ref = { id: secao.id, titulo: secao.titulo };
    if (secao.modo === 'SORTEIO') {
      const n = Math.min(secao.sortear ?? 0, daSecao.length);
      const peso = (secao.peso ?? 0) / Math.max(1, n);
      for (const item of embaralhar(daSecao).slice(0, n)) selecionados.push({ item, peso, secao: ref });
    } else {
      for (const item of randomizada ? embaralhar(daSecao) : daSecao) selecionados.push({ item, peso: item.peso, secao: ref });
    }
  }
  return selecionados;
}

export function montarInstancia(
  prova: ProvaParaAplicacao,
  embaralhar: Embaralhar = embaralharSeguro,
  gerarId: () => string = gerarIdOpaco,
) {
  const randomizada = prova.ordemQuestoes === 'RANDOMIZADA';
  const selecionados = selecionarItens(prova, embaralhar);

  const questoesFixadas: QuestaoFixada[] = [];
  const gabaritoCongelado: GabaritoCongelado = {};
  selecionados.forEach(({ item, peso, secao }, idx) => {
    const { alternativas, gabarito } = opacificar(
      item.versao.formato,
      apresentarAlternativas(item.versao.formato, item.versao.alternativas, randomizada, embaralhar),
      item.versao.gabarito,
      gerarId,
    );
    questoesFixadas.push({
      versaoQuestaoId: item.versao.id,
      ordem: idx + 1,
      peso,
      ...(secao ? { secaoId: secao.id, secaoTitulo: secao.titulo } : {}),
      natureza: item.versao.natureza,
      formato: item.versao.formato,
      disciplina: item.versao.disciplina,
      enunciado: item.versao.enunciado,
      alternativas,
      midias: item.versao.midias,
    });
    gabaritoCongelado[item.versao.id] = { gabarito, rubrica: item.versao.rubrica, midias: item.versao.midias };
  });
  return { questoesFixadas, gabaritoCongelado };
}

/** Identificador aleatório e sem relação com a posição ou o gabarito (ex.: "k3f9a1c2"). */
export function gerarIdOpaco(): string {
  return `k${randomBytes(4).toString('hex')}`;
}

/**
 * Associação e ordenação: os IDs da versão seguem o gabarito (`I1→O1`, ordem `A,B,C…`) e o
 * participante recebe as alternativas pela API — com eles, deduziria a resposta. Cada instância
 * ganha IDs aleatórios próprios, e o gabarito congelado é traduzido para os mesmos IDs; a correção,
 * o resultado e os recursos trabalham só com os da instância. Demais formatos: sem mudança.
 */
export function opacificar(
  formato: string,
  alternativas: Alternativa[] | null,
  gabarito: unknown,
  gerarId: () => string = gerarIdOpaco,
): { alternativas: Alternativa[] | null; gabarito: unknown } {
  if (!alternativas || (formato !== 'ASSOCIACAO' && formato !== 'ORDENACAO')) return { alternativas, gabarito };
  const mapa = new Map<string, string>();
  for (const a of alternativas) {
    let novo = gerarId();
    while ([...mapa.values()].includes(novo)) novo = gerarId();
    mapa.set(a.id, novo);
  }
  const traduzir = (id: string) => mapa.get(id) ?? id;
  const g = (gabarito ?? {}) as { pares?: Record<string, string>; ordem?: string[] };
  const traduzido =
    formato === 'ASSOCIACAO'
      ? { pares: Object.fromEntries(Object.entries(g.pares ?? {}).map(([i, o]) => [traduzir(i), traduzir(o)])) }
      : { ordem: (g.ordem ?? []).map(traduzir) };
  return { alternativas: alternativas.map((a) => ({ ...a, id: traduzir(a.id) })), gabarito: traduzido };
}

/**
 * Ordem em que o participante vê as alternativas:
 * - V/F: sempre natural; múltipla escolha e várias corretas: embaralha se a prova for randomizada;
 * - associação: a coluna B (opções) é SEMPRE embaralhada (senão a resposta seria a posição);
 * - ordenação: SEMPRE embaralhada e nunca na ordem correta (a ordem correta é o gabarito).
 */
export function apresentarAlternativas(
  formato: string,
  alternativas: Alternativa[] | null,
  randomizada: boolean,
  embaralhar: Embaralhar = embaralharSeguro,
): Alternativa[] | null {
  if (!alternativas) return null;
  if (formato === 'ASSOCIACAO') {
    const itens = alternativas.filter((a) => a.grupo === 'ITEM');
    const opcoes = alternativas.filter((a) => a.grupo === 'OPCAO');
    return [...(randomizada ? embaralhar(itens) : itens), ...embaralhar(opcoes)];
  }
  if (formato === 'ORDENACAO') {
    let ordem = embaralhar(alternativas);
    for (let i = 0; i < 10 && ordem.every((a, k) => a.id === alternativas[k]!.id); i++) ordem = embaralhar(alternativas);
    if (ordem.every((a, k) => a.id === alternativas[k]!.id)) ordem = [...alternativas].reverse();
    return ordem;
  }
  if (randomizada && (formato === 'MULTIPLA_ESCOLHA' || formato === 'MULTIPLA_RESPOSTA')) return embaralhar(alternativas);
  return alternativas;
}

/** Prazo da tentativa: início + tempo limite, nunca além do fim da janela. */
export function calcularPrazo(inicio: Date, tempoLimiteMin: number | null, janelaFim: Date): Date {
  if (tempoLimiteMin == null) return janelaFim;
  const limite = new Date(inicio.getTime() + tempoLimiteMin * 60_000);
  return limite < janelaFim ? limite : janelaFim;
}

const ALFABETO_PIN = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Código de acesso de prova pública: 8 caracteres sem ambíguos (0/O, 1/I/L). ~39 bits. */
export function gerarPin(): string {
  let pin = '';
  for (let i = 0; i < 8; i++) pin += ALFABETO_PIN[randomInt(ALFABETO_PIN.length)];
  return pin;
}

export function gerarCodigoComprovante(): string {
  return `${gerarPin()}${gerarPin()}`.slice(0, 12);
}
