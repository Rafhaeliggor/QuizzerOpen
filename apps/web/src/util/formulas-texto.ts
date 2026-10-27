/**
 * Detecção de fórmulas LaTeX entre \( … \) e \[ … \] — sem o KaTeX, para o texto comum não
 * carregar a biblioteca (BUG-060). A conversão para MathML fica em `formulas.ts` (sob demanda).
 */
const FORMULA = /\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g

export type Trecho = { tipo: 'texto'; valor: string } | { tipo: 'formula'; valor: string; destaque: boolean }

export function separarFormulas(texto: string): Trecho[] {
  const trechos: Trecho[] = []
  let ultimo = 0
  for (const m of texto.matchAll(FORMULA)) {
    if (m.index > ultimo) trechos.push({ tipo: 'texto', valor: texto.slice(ultimo, m.index) })
    trechos.push({ tipo: 'formula', valor: (m[1] ?? m[2] ?? '').trim(), destaque: m[2] !== undefined })
    ultimo = m.index + m[0].length
  }
  if (ultimo < texto.length) trechos.push({ tipo: 'texto', valor: texto.slice(ultimo) })
  return trechos
}
