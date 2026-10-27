import { Fragment } from 'react'
import { Icone } from './Icone'

interface Props {
  passos: string[]
  /** Índice (0-based) do passo atual. */
  atual: number
  /** Permite voltar a passos já visitados. */
  aoSelecionar?: (indice: number) => void
}

/** Indicador de etapas de um assistente (ex.: criação de prova): pílulas ligadas por setas. */
export function Stepper({ passos, atual, aoSelecionar }: Props) {
  return (
    <ol className="qz-stepper" aria-label="Etapas">
      {passos.map((p, i) => {
        const estado = i < atual ? 'feito' : i === atual ? 'atual' : 'futuro'
        const texto = `${i + 1}. ${p}${i < atual ? ' concluída' : ''}`
        return (
          <Fragment key={p}>
            {i > 0 && (
              <li aria-hidden className="qz-stepper__seta">
                <Icone nome="seta-direita" tamanho={16} />
              </li>
            )}
            <li className={`qz-stepper__passo qz-stepper__passo--${estado}`} aria-current={i === atual ? 'step' : undefined}>
              {aoSelecionar && i < atual ? (
                <button type="button" onClick={() => aoSelecionar(i)}>
                  {texto}
                </button>
              ) : (
                <span>{texto}</span>
              )}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
