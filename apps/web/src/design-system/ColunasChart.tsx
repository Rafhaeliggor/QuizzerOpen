interface Props {
  dados: { rotulo: string; valor: number }[]
  /** Topo da escala (ex.: 10 para notas). */
  maximo: number
  /** Índice da coluna em destaque (cor cheia); as demais ficam claras. */
  destaque?: number
  legenda?: string
  formatarValor?: (v: number) => string
  rotuloAcessivel: string
}

/** Colunas verticais (nota média por turma — painel e relatórios). */
export function ColunasChart({ dados, maximo, destaque = 0, legenda, formatarValor = String, rotuloAcessivel }: Props) {
  return (
    <figure className="qz-colunas" aria-label={`${rotuloAcessivel}: ${dados.map((d) => `${d.rotulo} ${formatarValor(d.valor)}`).join(', ')}`}>
      {legenda && <figcaption className="qz-colunas__legenda">{legenda}</figcaption>}
      <div className="qz-colunas__area" aria-hidden>
        {dados.map((d, i) => (
          <div key={i} className="qz-colunas__coluna">
            <span className="qz-colunas__valor">{formatarValor(d.valor)}</span>
            <span
              className={`qz-colunas__barra${i === destaque ? ' qz-colunas__barra--destaque' : ''}`}
              style={{ height: `${Math.max(2, (d.valor / maximo) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="qz-colunas__eixo" aria-hidden>
        {dados.map((d, i) => (
          <span key={i} title={d.rotulo}>{d.rotulo}</span>
        ))}
      </div>
    </figure>
  )
}
