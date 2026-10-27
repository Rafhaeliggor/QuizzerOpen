interface Props {
  rotulo?: string
  telaCheia?: boolean
}

export function Spinner({ rotulo = 'Carregando…', telaCheia }: Props) {
  return (
    <div className={`qz-spinner${telaCheia ? ' qz-spinner--tela-cheia' : ''}`} role="status">
      <span className="qz-spinner__circulo" aria-hidden />
      <span>{rotulo}</span>
    </div>
  )
}
