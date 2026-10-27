interface Props {
  dados: { rotulo: string; valor: number }[]
  /** Valor máximo da escala (padrão: maior valor). */
  maximo?: number
  formatarValor?: (v: number) => string
  rotuloAcessivel: string
}

/** Barras horizontais simples (distribuição de notas, taxa de acerto). */
export function BarChart({ dados, maximo, formatarValor = String, rotuloAcessivel }: Props) {
  const max = maximo ?? Math.max(1, ...dados.map((d) => d.valor))
  return (
    <div className="qz-barras" role="img" aria-label={`${rotuloAcessivel}: ${dados.map((d) => `${d.rotulo} ${formatarValor(d.valor)}`).join(', ')}`}>
      {dados.map((d) => (
        <div key={d.rotulo} className="qz-barras__linha">
          <span className="qz-barras__rotulo">{d.rotulo}</span>
          <span className="qz-barras__trilho">
            <span className="qz-barras__barra" style={{ width: `${(d.valor / max) * 100}%` }} />
          </span>
          <span className="qz-barras__valor">{formatarValor(d.valor)}</span>
        </div>
      ))}
    </div>
  )
}
