/** Normaliza o texto: sem acentos, minúsculo, só letras/números, palavras com 3+ letras. */
export function tokens(texto: string): Set<string> {
  return new Set(
    texto
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t.length >= 3),
  );
}

/** Similaridade de Jaccard entre os conjuntos de palavras (0 a 1). */
export function similaridade(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  let comum = 0;
  for (const t of ta) if (tb.has(t)) comum++;
  return comum / (ta.size + tb.size - comum);
}

/** Acima deste limite o autor é alertado antes de enviar para revisão (RF04 — exceção). */
export const LIMITE_SIMILARIDADE = 0.8;
