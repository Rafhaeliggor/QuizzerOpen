import { useId, type SelectHTMLAttributes } from 'react'

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  rotulo: string
  opcoes: { valor: string; rotulo: string }[]
  ajuda?: string
}

export function SelectField({ rotulo, opcoes, ajuda, id, ...resto }: Props) {
  const gerado = useId()
  const campoId = id ?? gerado
  return (
    <div className="qz-campo">
      <label htmlFor={campoId}>{rotulo}</label>
      <select id={campoId} {...resto}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {ajuda && <span className="qz-campo__ajuda">{ajuda}</span>}
    </div>
  )
}
