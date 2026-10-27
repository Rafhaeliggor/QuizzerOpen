/** Regras puras da dupla correção com arbitragem (lote 9 — ADR-0053). */

export type PapelAvaliacao = 'PRIMEIRA' | 'SEGUNDA' | 'ARBITRAGEM';

export interface AvaliacaoExistente {
  papel: PapelAvaliacao;
  corretorId: string;
  fracao: number;
}

export type DecisaoDupla =
  | { papel: PapelAvaliacao; fracaoFinal: number | null; aguardaArbitragem: boolean }
  | { erro: string };

const arred = (n: number) => Math.round(n * 10_000) / 10_000;

/**
 * Próximo passo ao receber uma correção:
 * - 1ª correção: fica registrada, a questão continua pendente;
 * - 2ª (outra pessoa): se a diferença ≤ limiar (pontos percentuais), vale a média; senão, arbitragem;
 * - arbitragem: autor da prova ou coordenação, que não tenha corrigido antes — vale a nota do árbitro.
 * Antes da 2ª, quem fez a 1ª pode refazê-la.
 */
export function decidirDupla(
  avaliacoes: AvaliacaoExistente[],
  corretorId: string,
  podeArbitrar: boolean,
  limiar: number,
  fracao: number,
): DecisaoDupla {
  const p = avaliacoes.find((a) => a.papel === 'PRIMEIRA');
  const s = avaliacoes.find((a) => a.papel === 'SEGUNDA');
  if (!p) return { papel: 'PRIMEIRA', fracaoFinal: null, aguardaArbitragem: false };
  if (!s) {
    if (p.corretorId === corretorId) return { papel: 'PRIMEIRA', fracaoFinal: null, aguardaArbitragem: false };
    const divergencia = Math.abs(p.fracao - fracao) * 100;
    return divergencia <= limiar + 1e-9
      ? { papel: 'SEGUNDA', fracaoFinal: arred((p.fracao + fracao) / 2), aguardaArbitragem: false }
      : { papel: 'SEGUNDA', fracaoFinal: null, aguardaArbitragem: true };
  }
  const divergiu = Math.abs(p.fracao - s.fracao) * 100 > limiar + 1e-9;
  if (!divergiu) return { erro: 'A dupla correção desta questão já foi concluída — ajustes só por recurso' };
  if (corretorId === p.corretorId || corretorId === s.corretorId) {
    return { erro: 'A arbitragem deve ser feita por quem não corrigiu a questão' };
  }
  if (!podeArbitrar) return { erro: 'A arbitragem cabe ao autor da prova ou à coordenação' };
  return { papel: 'ARBITRAGEM', fracaoFinal: arred(fracao), aguardaArbitragem: false };
}

/** O que esta pessoa pode fazer na questão (para a fila de correção). */
export function acaoPendente(
  avaliacoes: AvaliacaoExistente[],
  corretorId: string,
  podeArbitrar: boolean,
  aguardaArbitragem: boolean,
): 'PRIMEIRA' | 'SEGUNDA' | 'ARBITRAGEM' | null {
  const p = avaliacoes.find((a) => a.papel === 'PRIMEIRA');
  const s = avaliacoes.find((a) => a.papel === 'SEGUNDA');
  if (!p) return 'PRIMEIRA';
  if (!s) return p.corretorId === corretorId ? null : 'SEGUNDA';
  if (aguardaArbitragem && podeArbitrar && corretorId !== p.corretorId && corretorId !== s.corretorId) return 'ARBITRAGEM';
  return null;
}
