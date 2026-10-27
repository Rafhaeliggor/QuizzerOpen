import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Icone } from '../design-system'
import { useDefinirTituloPagina } from '../layouts/identidade'

interface Props {
  titulo: ReactNode
  descricao?: ReactNode
  /** `rotulo` é a frase completa ("Voltar para provas"). */
  voltar?: { para: string; rotulo: string }
  acoes?: ReactNode
  /** Etiqueta acima do título (ex.: "Matemática · 2º ano A"). */
  sobretitulo?: ReactNode
}

export function CabecalhoPagina({ titulo, descricao, voltar, acoes, sobretitulo }: Props) {
  const definirTitulo = useDefinirTituloPagina()
  const tituloTexto = typeof titulo === 'string' ? titulo : null
  useEffect(() => {
    definirTitulo(tituloTexto)
    return () => definirTitulo(null)
  }, [definirTitulo, tituloTexto])

  return (
    <div className="qz-cabecalho-pagina">
      <div className="qz-cabecalho-pagina__textos">
        {voltar && (
          <Link to={voltar.para} className="qz-voltar">
            <Icone nome="seta-esquerda" tamanho={14} /> {voltar.rotulo}
          </Link>
        )}
        {sobretitulo && <div className="qz-cabecalho-pagina__sobretitulo">{sobretitulo}</div>}
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className="qz-acoes">{acoes}</div>}
    </div>
  )
}
