import { arredondar } from '../correcao/calculo.js';
/** Funções puras de agregação para os relatórios (RF09). */

export interface NotaRelatorio {
  id: string;
  tentativaId?: string;
  provaId: string;
  aplicacaoId?: string;
  provaTitulo: string;
  usuarioId: string | null;
  participanteNome: string;
  participanteEmail: string;
  tentativaNumero: number;
  certificado: boolean;
  inicioEm: Date;
  fimEm: Date;
  status: string;
  notaFinal: unknown;
  notaProvisoria: unknown;
  statusAprovacao: string | null;
  questoes: {
    versaoQuestaoId: string;
    ordem: number;
    natureza: string;
    formato?: string;
    disciplina?: string;
    peso: unknown;
    /** Só nas consultas detalhadas (relatório de uma prova): por questão e indícios. */
    enunciado?: string;
    fracao: unknown;
    resposta?: unknown;
  }[];
}

const num = (v: unknown) => (v == null ? null : Number(v));
const arred = (n: number) => arredondar(n, 2);

/**
 * Quem é o participante de uma nota: o aluno (usuarioId) ou, para externo, a aplicação + e-mail.
 * Nota anonimizada pela LGPD (sem usuário e sem e-mail) fica sozinha — não dá mais para ligá-la
 * a outra tentativa, e juntar todas as anonimizadas numa linha distorcia médias e contagens.
 */
function chaveParticipante(n: { id: string; usuarioId?: string | null; aplicacaoId?: string; participanteEmail: string }) {
  if (n.usuarioId) return `u:${n.usuarioId}`;
  if (n.participanteEmail) return `e:${n.aplicacaoId ?? ''}|${n.participanteEmail.toLowerCase()}`;
  return `n:${n.id}`;
}

/** Considera só a última tentativa de cada participante (a que vale como resultado). */
export function ultimasTentativas<
  T extends { id: string; usuarioId?: string | null; aplicacaoId?: string; participanteEmail: string; provaId: string; tentativaNumero: number },
>(notas: T[]): T[] {
  const porParticipante = new Map<string, T>();
  for (const n of notas) {
    const chave = `${n.provaId}|${chaveParticipante(n)}`;
    const atual = porParticipante.get(chave);
    if (!atual || n.tentativaNumero > atual.tentativaNumero) porParticipante.set(chave, n);
  }
  return [...porParticipante.values()];
}

export function resumo(notas: NotaRelatorio[]) {
  const consolidadas = notas.filter((n) => n.status === 'CONSOLIDADA');
  const valores = consolidadas.map((n) => num(n.notaFinal)!).sort((a, b) => a - b);
  const comCriterio = consolidadas.filter((n) => n.statusAprovacao === 'APROVADO' || n.statusAprovacao === 'REPROVADO');
  const aprovados = comCriterio.filter((n) => n.statusAprovacao === 'APROVADO').length;
  const duracoes = notas.map((n) => (n.fimEm.getTime() - n.inicioEm.getTime()) / 60_000);
  const media = valores.length ? arred(valores.reduce((s, v) => s + v, 0) / valores.length) : null;
  const meio = Math.floor(valores.length / 2);
  const mediana = valores.length
    ? arred(valores.length % 2 ? valores[meio]! : (valores[meio - 1]! + valores[meio]!) / 2)
    : null;

  const faixas = ['0–2', '2–4', '4–6', '6–8', '8–10'];
  const distribuicao = faixas.map((faixa) => ({ faixa, quantidade: 0 }));
  for (const v of valores) distribuicao[Math.min(4, Math.floor(v / 2))]!.quantidade++;

  return {
    participantes: notas.length,
    consolidadas: consolidadas.length,
    pendentes: notas.length - consolidadas.length,
    media,
    mediana,
    minima: valores.length ? valores[0]! : null,
    maxima: valores.length ? valores.at(-1)! : null,
    aprovados,
    taxaAprovacao: comCriterio.length ? arred((aprovados / comCriterio.length) * 100) : null,
    tempoMedioMin: duracoes.length ? arred(duracoes.reduce((s, d) => s + d, 0) / duracoes.length) : null,
    distribuicao,
  };
}

/** Taxa de acerto por questão = média da fração obtida entre as tentativas já corrigidas. */
export function porQuestao(notas: NotaRelatorio[], anuladas: Set<string>) {
  const mapa = new Map<string, { ordem: number; natureza: string; peso: number; enunciado: string; soma: number; corrigidas: number }>();
  for (const n of notas) {
    for (const q of n.questoes) {
      const atual = mapa.get(q.versaoQuestaoId) ?? {
        ordem: q.ordem,
        natureza: q.natureza,
        peso: Number(q.peso),
        enunciado: q.enunciado ?? '',
        soma: 0,
        corrigidas: 0,
      };
      const f = num(q.fracao);
      if (f != null) {
        atual.soma += f;
        atual.corrigidas++;
      }
      mapa.set(q.versaoQuestaoId, atual);
    }
  }
  return [...mapa.entries()]
    .map(([versaoQuestaoId, q]) => ({
      versaoQuestaoId,
      ordem: q.ordem,
      natureza: q.natureza,
      peso: q.peso,
      enunciado: (q.enunciado ?? '').slice(0, 200),
      corrigidas: q.corrigidas,
      taxaAcerto: q.corrigidas ? arred((q.soma / q.corrigidas) * 100) : null,
      anulada: anuladas.has(versaoQuestaoId),
    }))
    .sort((a, b) => a.ordem - b.ordem);
}

export function linhaParticipante(n: NotaRelatorio) {
  return {
    notaId: n.id,
    nome: n.participanteNome,
    email: n.participanteEmail,
    tentativa: n.tentativaNumero,
    status: n.status,
    nota: num(n.notaFinal) ?? num(n.notaProvisoria),
    notaFinal: num(n.notaFinal),
    statusAprovacao: n.statusAprovacao,
    duracaoMin: arred((n.fimEm.getTime() - n.inicioEm.getTime()) / 60_000),
    fimEm: n.fimEm,
    certificado: n.certificado,
  };
}

/**
 * Desempenho por disciplina: média da fração obtida nas questões já corrigidas de cada
 * disciplina (anuladas fora). Notas anteriores ao lote 6 sem disciplina viram "Sem disciplina".
 */
/**
 * `anuladas`: chaves `provaId|versaoQuestaoId` — a anulação vale só na prova em que foi feita
 * (a mesma versão de questão pode estar em outra prova, sem anulação).
 */
export function chaveAnulacao(provaId: string, versaoQuestaoId: string) {
  return `${provaId}|${versaoQuestaoId}`;
}

export function porDisciplina(notas: NotaRelatorio[], anuladas: Set<string> = new Set()) {
  const mapa = new Map<string, { soma: number; corrigidas: number; participantes: Set<string> }>();
  for (const n of notas) {
    for (const q of n.questoes) {
      if (anuladas.has(chaveAnulacao(n.provaId, q.versaoQuestaoId))) continue;
      const f = num(q.fracao);
      if (f == null) continue;
      const chave = q.disciplina?.trim() || 'Sem disciplina';
      const atual = mapa.get(chave) ?? { soma: 0, corrigidas: 0, participantes: new Set<string>() };
      atual.soma += f;
      atual.corrigidas++;
      atual.participantes.add(chaveParticipante(n));
      mapa.set(chave, atual);
    }
  }
  return [...mapa.entries()]
    .map(([disciplina, d]) => ({
      disciplina,
      questoesCorrigidas: d.corrigidas,
      participantes: d.participantes.size,
      taxaAcerto: arred((d.soma / d.corrigidas) * 100),
    }))
    .sort((a, b) => a.disciplina.localeCompare(b.disciplina, 'pt-BR'));
}

export interface SinaisTentativa {
  saidasDeFoco: number;
  trocasSessao: number;
}

export interface Indicio {
  notaId: string;
  nome: string;
  motivos: { codigo: 'MUITO_RAPIDO' | 'SAIDAS_DA_PROVA' | 'TROCAS_DE_DISPOSITIVO' | 'RESPOSTAS_COINCIDENTES'; descricao: string }[];
}

const LIMITES_INDICIOS = { fracaoDaMediana: 0.25, saidas: 3, trocas: 2, errosIguais: 3, minimoParticipantes: 5, maxPares: 400 };

/** Chave comparável de uma resposta fechada (alternativa(s) ou texto normalizado). */
function chaveResposta(r: unknown): string | null {
  const v = r as { alternativaId?: unknown; alternativaIds?: unknown; texto?: unknown } | null;
  if (!v) return null;
  if (typeof v.alternativaId === 'string') return `a:${v.alternativaId}`;
  if (Array.isArray(v.alternativaIds) && v.alternativaIds.length) return `m:${[...v.alternativaIds].map(String).sort((a, b) => a.localeCompare(b)).join(',')}`;
  if (typeof v.texto === 'string' && v.texto.trim()) return `t:${v.texto.trim().toLowerCase().replace(/\s+/g, ' ')}`;
  return null;
}

/**
 * Indícios para REVISÃO HUMANA (ADR-0045) — não são prova de fraude:
 * - envio muito rápido (< 25% da mediana de duração, com 5+ participantes);
 * - 3+ saídas da aba da prova; 2+ trocas de dispositivo;
 * - mesmos ERROS em 3+ questões fechadas entre dois participantes (erro igual é bem mais raro que acerto igual).
 */
export function indicios(notas: NotaRelatorio[], sinais: Map<string, SinaisTentativa> = new Map()): Indicio[] {
  const mapa = new Map<string, Indicio>();
  const add = (n: NotaRelatorio, m: Indicio['motivos'][number]) => {
    const atual = mapa.get(n.id) ?? { notaId: n.id, nome: n.participanteNome, motivos: [] };
    atual.motivos.push(m);
    mapa.set(n.id, atual);
  };
  const duracoes = notas.map((n) => (n.fimEm.getTime() - n.inicioEm.getTime()) / 60_000).sort((a, b) => a - b);
  const mediana = duracoes.length ? duracoes[Math.floor(duracoes.length / 2)]! : 0;
  for (const n of notas) {
    const dur = (n.fimEm.getTime() - n.inicioEm.getTime()) / 60_000;
    if (notas.length >= LIMITES_INDICIOS.minimoParticipantes && mediana > 0 && dur < mediana * LIMITES_INDICIOS.fracaoDaMediana) {
      add(n, { codigo: 'MUITO_RAPIDO', descricao: `Enviou em ${arred(dur)} min (mediana da prova: ${arred(mediana)} min)` });
    }
    const s = n.tentativaId ? sinais.get(n.tentativaId) : undefined;
    if (s && s.saidasDeFoco >= LIMITES_INDICIOS.saidas) {
      add(n, { codigo: 'SAIDAS_DA_PROVA', descricao: `Saiu da aba da prova ${s.saidasDeFoco} vezes` });
    }
    if (s && s.trocasSessao >= LIMITES_INDICIOS.trocas) {
      add(n, { codigo: 'TROCAS_DE_DISPOSITIVO', descricao: `Abriu a prova em outro dispositivo/aba ${s.trocasSessao} vezes` });
    }
  }
  // Erros coincidentes: só questões fechadas corrigidas com fração 0 e resposta dada.
  const erros = notas.slice(0, LIMITES_INDICIOS.maxPares).map((n) => ({
    n,
    erros: new Map(
      n.questoes
        .filter((q) => q.natureza === 'FECHADA' && num(q.fracao) === 0)
        .map((q) => [q.versaoQuestaoId, chaveResposta(q.resposta)] as const)
        .filter((x): x is readonly [string, string] => x[1] !== null),
    ),
  }));
  for (let i = 0; i < erros.length; i++) {
    for (let j = i + 1; j < erros.length; j++) {
      const a = erros[i]!;
      const b = erros[j]!;
      if (chaveParticipante(a.n) === chaveParticipante(b.n)) continue;
      let iguais = 0;
      for (const [q, r] of a.erros) if (b.erros.get(q) === r) iguais++;
      if (iguais >= LIMITES_INDICIOS.errosIguais) {
        add(a.n, { codigo: 'RESPOSTAS_COINCIDENTES', descricao: `${iguais} erros idênticos aos de ${b.n.participanteNome}` });
        add(b.n, { codigo: 'RESPOSTAS_COINCIDENTES', descricao: `${iguais} erros idênticos aos de ${a.n.participanteNome}` });
      }
    }
  }
  return [...mapa.values()].sort((x, y) => y.motivos.length - x.motivos.length || x.nome.localeCompare(y.nome, 'pt-BR'));
}
