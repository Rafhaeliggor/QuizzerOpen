interface Props<T extends string> {
  abas: { valor: T; rotulo: string; contador?: number }[]
  ativa: T
  aoMudar: (valor: T) => void
  rotulo: string
}

export function Tabs<T extends string>({ abas, ativa, aoMudar, rotulo }: Props<T>) {
  return (
    <div className="qz-abas" role="tablist" aria-label={rotulo}>
      {abas.map((a) => (
        <button
          key={a.valor}
          type="button"
          role="tab"
          aria-selected={a.valor === ativa}
          className={`qz-aba${a.valor === ativa ? ' qz-aba--ativa' : ''}`}
          onClick={() => aoMudar(a.valor)}
        >
          {a.contador != null ? `${a.rotulo} (${a.contador})` : a.rotulo}
        </button>
      ))}
    </div>
  )
}
