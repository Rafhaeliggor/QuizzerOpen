import { useId, type InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  rotulo: string
  ajuda?: string
  erro?: string
}

export function TextField({ rotulo, ajuda, erro, id, ...resto }: Props) {
  const gerado = useId()
  const campoId = id ?? gerado
  const descricaoId = `${campoId}-descricao`
  return (
    <div className={`qz-campo${erro ? ' qz-campo--erro' : ''}`}>
      <label htmlFor={campoId}>{rotulo}</label>
      <input id={campoId} aria-invalid={!!erro} aria-describedby={erro || ajuda ? descricaoId : undefined} {...resto} />
      {erro ? (
        <span id={descricaoId} className="qz-campo__erro">
          {erro}
        </span>
      ) : (
        ajuda && (
          <span id={descricaoId} className="qz-campo__ajuda">
            {ajuda}
          </span>
        )
      )}
    </div>
  )
}
