import type { ReactNode } from 'react'
import { Icone } from './Icone'
import { Spinner } from './Spinner'

export interface Coluna<T> {
  chave: string
  titulo: string
  render: (linha: T) => ReactNode
  largura?: string
}

interface Paginacao {
  pagina: number
  tamanho: number
  total: number
  aoMudarPagina: (pagina: number) => void
}

interface Props<T> {
  colunas: Coluna<T>[]
  linhas: T[]
  chaveLinha: (linha: T) => string
  carregando?: boolean
  vazio?: ReactNode
  paginacao?: Paginacao
  rotulo?: string
  /** Nome dos itens no rodapé ("Mostrando 1–6 de 248 questões"). */
  rotuloItens?: string
}

/** Até 3 páginas ao redor da atual, mais a última; `null` marca reticências. */
function paginasVisiveis(atual: number, total: number): (number | null)[] {
  const inicio = Math.max(1, Math.min(atual - 1, total - 2))
  const lista: (number | null)[] = []
  for (let p = inicio; p <= Math.min(total, inicio + 2); p++) lista.push(p)
  const ultima = lista[lista.length - 1] as number
  if (ultima < total - 1) lista.push(null)
  if (ultima < total) lista.push(total)
  return lista
}

/** Tabela densa do ambiente profissional, com paginação opcional controlada pelo servidor. */
export function DataTable<T>({ colunas, linhas, chaveLinha, carregando, vazio, paginacao, rotulo, rotuloItens }: Props<T>) {
  const totalPaginas = paginacao ? Math.max(1, Math.ceil(paginacao.total / paginacao.tamanho)) : 1
  return (
    <div className="qz-tabela-wrapper">
      <table className="qz-tabela" aria-label={rotulo} aria-busy={carregando}>
        <thead>
          <tr>
            {colunas.map((c) => (
              <th key={c.chave} style={c.largura ? { width: c.largura } : undefined} scope="col">
                {c.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {carregando ? (
            <tr>
              <td colSpan={colunas.length} className="qz-tabela__vazio">
                <Spinner rotulo="Carregando…" />
              </td>
            </tr>
          ) : linhas.length === 0 ? (
            <tr>
              <td colSpan={colunas.length} className="qz-tabela__vazio">
                {vazio ?? 'Nenhum registro encontrado.'}
              </td>
            </tr>
          ) : (
            linhas.map((linha) => (
              <tr key={chaveLinha(linha)}>
                {colunas.map((c) => (
                  <td key={c.chave}>{c.render(linha)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {paginacao && paginacao.total > 0 && (
        <div className="qz-paginacao">
          <span>
            Mostrando {(paginacao.pagina - 1) * paginacao.tamanho + 1}–{Math.min(paginacao.pagina * paginacao.tamanho, paginacao.total)} de{' '}
            {paginacao.total}
            {rotuloItens ? ` ${rotuloItens}` : ''}
          </span>
          <nav className="qz-paginacao__paginas" aria-label="Paginação">
            <button
              type="button"
              aria-label="Anterior"
              disabled={paginacao.pagina <= 1}
              onClick={() => paginacao.aoMudarPagina(paginacao.pagina - 1)}
            >
              <Icone nome="chevron-esquerda" tamanho={16} />
            </button>
            {paginasVisiveis(paginacao.pagina, totalPaginas).map((p, i) =>
              p === null ? (
                <span key={`r${i}`} aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  aria-current={p === paginacao.pagina ? 'page' : undefined}
                  aria-label={`Página ${p}`}
                  onClick={() => paginacao.aoMudarPagina(p)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              aria-label="Próxima"
              disabled={paginacao.pagina >= totalPaginas}
              onClick={() => paginacao.aoMudarPagina(paginacao.pagina + 1)}
            >
              <Icone nome="chevron-direita" tamanho={16} />
            </button>
          </nav>
        </div>
      )}
    </div>
  )
}
