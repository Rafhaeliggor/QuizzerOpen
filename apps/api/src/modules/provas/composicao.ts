/** Regras puras da composição por seções e sorteio (RF05 — ADR-0048). */

export interface SecaoComposta {
  modo: 'FIXA' | 'SORTEIO';
  sortear?: number | null;
  /** SORTEIO: peso total da seção. */
  peso?: number | null;
  itens: { peso?: number | null }[];
}

const arred = (n: number) => Math.round(n * 100) / 100;

/** Soma dos pesos que um participante recebe: itens FIXA + peso de cada seção de SORTEIO. */
export function somaPesos(itensSemSecao: { peso: number }[], secoes: SecaoComposta[]): number {
  return arred(
    itensSemSecao.reduce((s, i) => s + i.peso, 0) +
      secoes.reduce((s, sec) => s + (sec.modo === 'SORTEIO' ? Number(sec.peso ?? 0) : sec.itens.reduce((t, i) => t + Number(i.peso ?? 0), 0)), 0),
  );
}

/** Quantas questões cada participante recebe. */
export function questoesPorParticipante(itensSemSecao: number, secoes: SecaoComposta[]): number {
  return itensSemSecao + secoes.reduce((s, sec) => s + (sec.modo === 'SORTEIO' ? Number(sec.sortear ?? 0) : sec.itens.length), 0);
}

/** Problemas de uma composição (lista vazia = válida para salvar). */
export function problemasDasSecoes(secoes: SecaoComposta[]): string[] {
  const erros: string[] = [];
  secoes.forEach((s, i) => {
    const nome = `Seção ${i + 1}`;
    if (s.itens.length === 0) erros.push(`${nome}: adicione questões`);
    if (s.modo === 'SORTEIO') {
      if (!s.sortear || s.sortear < 1) erros.push(`${nome}: informe quantas questões sortear`);
      else if (s.sortear > s.itens.length) erros.push(`${nome}: sortear ${s.sortear} de ${s.itens.length} questões não é possível`);
      if (!s.peso || s.peso <= 0) erros.push(`${nome}: informe o peso da seção`);
    } else if (s.itens.some((it) => !it.peso || it.peso <= 0)) {
      erros.push(`${nome}: toda questão precisa de peso maior que zero`);
    }
  });
  return erros;
}
