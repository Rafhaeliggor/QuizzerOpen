import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react'

interface Props {
  aberto: boolean
  titulo: string
  children: ReactNode
  acoes: ReactNode
  aoFechar: () => void
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Caixa de diálogo modal (confirmações). Esc fecha; o foco vai para o diálogo ao abrir, fica preso
 * nele enquanto aberto (Tab circula entre os controles) e volta para quem abriu ao fechar.
 */
export function Dialog({ aberto, titulo, children, acoes, aoFechar }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  // As páginas passam `aoFechar` como função nova a cada render. Guardá-la num ref evita refazer o
  // efeito de foco a cada tecla digitada num campo do diálogo (BUG-058: o campo perdia o foco).
  const aoFecharRef = useRef(aoFechar)
  useLayoutEffect(() => {
    aoFecharRef.current = aoFechar
  })

  useEffect(() => {
    if (!aberto) return
    const anterior = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        aoFecharRef.current()
        return
      }
      if (e.key !== 'Tab' || !ref.current) return
      const focaveis = [...ref.current.querySelectorAll<HTMLElement>(FOCAVEIS)]
      if (focaveis.length === 0) {
        e.preventDefault()
        return
      }
      const primeiro = focaveis[0]!
      const ultimo = focaveis[focaveis.length - 1]!
      const atual = document.activeElement
      if (e.shiftKey && (atual === primeiro || atual === ref.current)) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (atual === ultimo || !ref.current.contains(atual))) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('keydown', tecla)
      anterior?.focus()
    }
  }, [aberto])

  if (!aberto) return null
  return (
    <div className="qz-dialog__fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFecharRef.current()}>
      <div className="qz-dialog" role="dialog" aria-modal="true" aria-labelledby={tituloId} tabIndex={-1} ref={ref}>
        <h2 id={tituloId}>{titulo}</h2>
        <div className="qz-dialog__corpo">{children}</div>
        <div className="qz-dialog__acoes">{acoes}</div>
      </div>
    </div>
  )
}
