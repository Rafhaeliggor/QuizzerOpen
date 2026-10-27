import { useId, type InputHTMLAttributes } from 'react'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  rotulo: string
  descricao?: string
}

/** Interruptor liga/desliga com rótulo e descrição (checkbox com papel de switch). */
export function Interruptor({ rotulo, descricao, id, ...resto }: Props) {
  const gerado = useId()
  const campoId = id ?? gerado
  return (
    <div className="qz-interruptor">
      <label htmlFor={campoId} className="qz-interruptor__texto">
        <strong>{rotulo}</strong>
        {descricao && <span>{descricao}</span>}
      </label>
      <input id={campoId} type="checkbox" role="switch" className="qz-interruptor__controle" {...resto} />
    </div>
  )
}
