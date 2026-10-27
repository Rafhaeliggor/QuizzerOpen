import { useId, type TextareaHTMLAttributes } from 'react'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  rotulo: string
  ajuda?: string
  erro?: string
}

export function TextArea({ rotulo, ajuda, erro, id, rows = 4, ...resto }: Props) {
  const gerado = useId()
  const campoId = id ?? gerado
  const descricaoId = `${campoId}-descricao`
  return (
    <div className={`qz-campo${erro ? ' qz-campo--erro' : ''}`}>
      <label htmlFor={campoId}>{rotulo}</label>
      <textarea id={campoId} rows={rows} aria-invalid={!!erro} aria-describedby={erro || ajuda ? descricaoId : undefined} {...resto} />
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
