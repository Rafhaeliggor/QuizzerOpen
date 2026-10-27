import { useEffect, useState } from 'react'
import { Icone } from './Icone'

interface Props {
  /** Prazo calculado pelo servidor (ISO). */
  prazo: string
  /** Diferença relógio do servidor − relógio local, em ms (sincronização). */
  deslocamentoMs?: number
  aoEsgotar?: () => void
}

function formatar(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/**
 * Cronômetro regressivo apenas VISUAL: a fonte da verdade é o prazo do servidor
 * (RNF03). O deslocamento corrige diferenças entre o relógio do aluno e o do servidor.
 */
export function Timer({ prazo, deslocamentoMs = 0, aoEsgotar }: Props) {
  const fim = new Date(prazo).getTime()
  const restante = () => fim - (Date.now() + deslocamentoMs)
  const [ms, setMs] = useState(restante)

  useEffect(() => {
    const id = setInterval(() => {
      const r = fim - (Date.now() + deslocamentoMs)
      setMs(r)
      if (r <= 0) {
        clearInterval(id)
        aoEsgotar?.()
      }
    }, 500)
    return () => clearInterval(id)
  }, [fim, deslocamentoMs, aoEsgotar])

  const nivel = ms <= 60_000 ? 'critico' : ms <= 5 * 60_000 ? 'alerta' : 'normal'
  return (
    <div className={`qz-timer qz-timer--${nivel}`} role="timer" aria-label="Tempo restante">
      <Icone nome="relogio" tamanho={22} className="qz-timer__icone" />
      <span className="qz-timer__textos">
        <span className="qz-timer__rotulo">Tempo restante</span>
        <span className="qz-timer__valor">{formatar(ms)}</span>
      </span>
    </div>
  )
}
