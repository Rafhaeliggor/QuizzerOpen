import type { Alternativa, Gabarito, ValorResposta } from '../api/tipos'
import { Button } from '../design-system'
import { TextoRico } from './TextoRico'

const textoDe = (alternativas: Alternativa[], id: string | undefined) => alternativas.find((a) => a.id === id)?.texto

/** Mostra resposta e/ou gabarito de associação ou ordenação (detalhe, correção, resultado, impressão). */
export function RespostaEstruturada({
  formato,
  alternativas,
  resposta,
  gabarito,
}: {
  formato: string
  alternativas: Alternativa[] | null
  resposta?: ValorResposta | null
  gabarito?: Gabarito | null
}) {
  const alt = alternativas ?? []
  if (formato === 'ASSOCIACAO') {
    const itens = alt.filter((a) => a.grupo === 'ITEM')
    const opcoes = alt.filter((a) => a.grupo === 'OPCAO').sort((a, b) => a.texto.localeCompare(b.texto, 'pt-BR'))
    if (resposta === undefined && !gabarito) {
      // Prova impressa sem gabarito: as duas colunas, a B em ordem alfabética.
      return (
        <div className="qz-grade-campos">
          <ol>
            {itens.map((i) => (
              <li key={i.id}>
                <TextoRico texto={i.texto} /> ( )
              </li>
            ))}
          </ol>
          <ol type="a">
            {opcoes.map((o) => (
              <li key={o.id}>
                <TextoRico texto={o.texto} />
              </li>
            ))}
          </ol>
        </div>
      )
    }
    return (
      <table className="qz-tabela qz-tabela--compacta">
        <thead>
          <tr>
            <th>Coluna A</th>
            {resposta !== undefined && <th>Resposta</th>}
            {gabarito && <th>Correta</th>}
          </tr>
        </thead>
        <tbody>
          {itens.map((i) => {
            const dada = resposta?.pares?.[i.id]
            const certa = gabarito?.pares?.[i.id]
            return (
              <tr key={i.id}>
                <td>
                  <TextoRico texto={i.texto} />
                </td>
                {resposta !== undefined && (
                  <td className={gabarito ? (dada === certa ? 'qz-certo' : 'qz-errado') : undefined}>
                    {dada ? <TextoRico texto={textoDe(alt, dada)} /> : <span className="qz-suave">—</span>}
                  </td>
                )}
                {gabarito && (
                  <td>
                    <TextoRico texto={textoDe(alt, certa)} />
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    )
  }
  if (formato === 'ORDENACAO') {
    const lista = (ids: string[]) => (
      <ol>
        {ids.map((id) => (
          <li key={id}>
            <TextoRico texto={textoDe(alt, id)} />
          </li>
        ))}
      </ol>
    )
    return (
      <div className="qz-grade-campos">
        {resposta !== undefined && (
          <div>
            <div className="qz-suave qz-pequeno">Ordem respondida</div>
            {resposta?.ordem?.length ? lista(resposta.ordem) : <p className="qz-suave">—</p>}
          </div>
        )}
        {gabarito?.ordem && (
          <div className="qz-gabarito">
            <div className="qz-pequeno">
              <strong>Ordem correta</strong>
            </div>
            {lista(gabarito.ordem)}
          </div>
        )}
        {/* Sem resposta nem gabarito (ex.: prova impressa): ordem alfabética — a ordem salva É o gabarito. */}
        {resposta === undefined && !gabarito?.ordem &&
          lista([...alt].sort((a, b) => a.texto.localeCompare(b.texto, 'pt-BR')).map((a) => a.id))}
      </div>
    )
  }
  return null
}

/** Associação na prova: um seletor da coluna B para cada item da coluna A. */
export function EntradaAssociacao({
  alternativas,
  valor,
  aoMudar,
}: {
  alternativas: Alternativa[]
  valor: ValorResposta | undefined
  aoMudar: (v: ValorResposta) => void
}) {
  const itens = alternativas.filter((a) => a.grupo === 'ITEM')
  const opcoes = alternativas.filter((a) => a.grupo === 'OPCAO')
  const pares = valor?.pares ?? {}
  return (
    <div className="qz-pilha" style={{ gap: 8 }}>
      {itens.map((i, k) => (
        <label key={i.id} className="qz-associacao">
          <span>
            <strong>{k + 1}.</strong> <TextoRico texto={i.texto} />
          </span>
          <select
            className="qz-input"
            aria-label={`Opção para o item ${k + 1}`}
            value={pares[i.id] ?? ''}
            onChange={(e) => {
              const novo = { ...pares }
              if (e.target.value) novo[i.id] = e.target.value
              else delete novo[i.id]
              aoMudar({ pares: novo })
            }}
          >
            <option value="">— escolha —</option>
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.texto}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}

/** Ordenação na prova: mover itens; a ordem só vale como resposta depois de mexer ou confirmar. */
export function EntradaOrdenacao({
  alternativas,
  valor,
  aoMudar,
}: {
  alternativas: Alternativa[]
  valor: ValorResposta | undefined
  aoMudar: (v: ValorResposta) => void
}) {
  const ordem = valor?.ordem?.length ? valor.ordem : alternativas.map((a) => a.id)
  const mover = (i: number, d: -1 | 1) => {
    const c = [...ordem]
    ;[c[i], c[i + d]] = [c[i + d]!, c[i]!]
    aoMudar({ ordem: c })
  }
  return (
    <div className="qz-pilha" style={{ gap: 6 }}>
      <ol className="qz-ordenacao">
        {ordem.map((id, i) => (
          <li key={id}>
            <span className="qz-composicao__texto">
              <TextoRico texto={textoDe(alternativas, id)} />
            </span>
            <Button variante="fantasma" disabled={i === 0} onClick={() => mover(i, -1)} aria-label={`Subir item ${i + 1}`}>
              ↑
            </Button>
            <Button variante="fantasma" disabled={i === ordem.length - 1} onClick={() => mover(i, 1)} aria-label={`Descer item ${i + 1}`}>
              ↓
            </Button>
          </li>
        ))}
      </ol>
      {!valor?.ordem?.length && (
        <div>
          <Button variante="secundario" onClick={() => aoMudar({ ordem })}>
            Confirmar esta ordem
          </Button>
        </div>
      )}
    </div>
  )
}
