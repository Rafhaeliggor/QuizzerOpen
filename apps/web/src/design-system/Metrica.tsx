import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icone, type NomeIcone } from './Icone'

interface Props {
  rotulo: string
  valor: ReactNode
  icone?: NomeIcone
  /** Linha de apoio abaixo do valor. */
  detalhe?: ReactNode
  tom?: 'primaria' | 'sucesso' | 'alerta'
  para?: string
}

/** Cartão de indicador (painel, provas, usuários, relatórios). */
export function Metrica({ rotulo, valor, icone, detalhe, tom = 'primaria', para }: Props) {
  const conteudo = (
    <>
      <div className="qz-metrica__topo">
        <span className="qz-metrica__rotulo">{rotulo}</span>
        {icone && <Icone nome={icone} className={`qz-metrica__icone qz-metrica__icone--${tom}`} />}
      </div>
      <span className="qz-metrica__valor">{valor}</span>
      {detalhe && <span className={`qz-metrica__detalhe${tom === 'alerta' ? ' qz-metrica__detalhe--alerta' : ''}`}>{detalhe}</span>}
    </>
  )
  return para ? (
    <Link to={para} className="qz-metrica">
      {conteudo}
    </Link>
  ) : (
    <div className="qz-metrica">{conteudo}</div>
  )
}
