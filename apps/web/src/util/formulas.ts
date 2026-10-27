import katex from 'katex'

/** Fórmulas LaTeX → MathML (ADR-0047). Carregado sob demanda por componentes/TextoRico. */
export { separarFormulas, type Trecho } from './formulas-texto'

export function formulaParaMathml(tex: string, destaque = false): string {
  return katex.renderToString(tex, {
    output: 'mathml',
    displayMode: destaque,
    throwOnError: false,
    trust: false,
    strict: 'ignore',
    maxSize: 10,
    maxExpand: 200,
  })
}
