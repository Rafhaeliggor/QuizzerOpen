import { CONTATO_ENCARREGADO, NOME_INSTITUICAO } from '../layouts/identidade'
import { formatarVersao, preencher, type DocumentoLegal } from './documentos'

const VALORES = { instituicao: NOME_INSTITUICAO, contatoEncarregado: CONTATO_ENCARREGADO }

/** Texto completo de um documento legal; `nivel` ajusta os títulos ao contexto (página ou caixa do aceite). */
export function TextoLegal({ doc, nivel = 1 }: { doc: DocumentoLegal; nivel?: 1 | 2 }) {
  const Titulo = nivel === 1 ? 'h1' : 'h2'
  const Secao = nivel === 1 ? 'h2' : 'h3'
  return (
    <article className="qz-legal" aria-label={doc.titulo}>
      <Titulo>{doc.titulo}</Titulo>
      <p className="qz-suave qz-pequeno">Versão de {formatarVersao()}</p>
      {doc.secoes.map((s) => (
        <section key={s.titulo}>
          <Secao>{s.titulo}</Secao>
          {s.blocos.map((b, i) =>
            typeof b === 'string' ? (
              <p key={i}>{preencher(b, VALORES)}</p>
            ) : (
              <ul key={i}>
                {b.map((item) => (
                  <li key={item}>{preencher(item, VALORES)}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </article>
  )
}
