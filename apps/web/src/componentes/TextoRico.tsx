import { Fragment, useEffect, useMemo, useState } from 'react'
import { separarFormulas } from '../util/formulas-texto'

type Conversor = (tex: string, destaque?: boolean) => string

// O KaTeX (~270 KB) só é baixado quando algum texto tem fórmula (BUG-060).
let conversorCarregado: Conversor | null = null
let carregando: Promise<Conversor> | null = null
function carregarConversor() {
  carregando ??= import('../util/formulas').then((m) => (conversorCarregado = m.formulaParaMathml))
  return carregando
}

/**
 * Texto de questão com fórmulas LaTeX entre \( … \) (na linha) e \[ … \] (em destaque) — ADR-0047.
 * Não usa "$" como delimitador (conflita com "R$"). O KaTeX gera **MathML** (sem estilos inline,
 * compatível com a CSP); `trust: false` bloqueia \href/\url e afins. O resto é texto puro do React.
 * Enquanto o KaTeX carrega, a fórmula aparece como o próprio LaTeX digitado.
 */
export function TextoRico({ texto }: { texto: string | null | undefined }) {
  const trechos = useMemo(() => separarFormulas(texto ?? ''), [texto])
  const temFormula = trechos.some((t) => t.tipo === 'formula')
  const [converter, setConverter] = useState<Conversor | null>(() => conversorCarregado)
  useEffect(() => {
    if (!temFormula || converter) return
    let ativo = true
    void carregarConversor().then((c) => ativo && setConverter(() => c))
    return () => {
      ativo = false
    }
  }, [temFormula, converter])

  return (
    <>
      {trechos.map((t, i) => {
        if (t.tipo === 'texto') return <Fragment key={i}>{t.valor}</Fragment>
        const classe = t.destaque ? 'qz-formula qz-formula--destaque' : 'qz-formula'
        return converter ? (
          // Saída do KaTeX (MathML gerado a partir do LaTeX, com escape) — única marcação injetada no app.
          <span key={i} className={classe} dangerouslySetInnerHTML={{ __html: converter(t.valor, t.destaque) }} />
        ) : (
          <span key={i} className={classe}>
            {t.valor}
          </span>
        )
      })}
    </>
  )
}
