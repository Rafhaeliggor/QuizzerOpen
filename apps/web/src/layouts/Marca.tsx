import { Link } from 'react-router'

/** Logotipo: selo "q" + nome do produto. */
export function Marca({ para }: { para: string }) {
  return (
    <Link to={para} className="qz-marca">
      <span className="qz-marca__icone" aria-hidden>
        q
      </span>
      Quizzer
    </Link>
  )
}
