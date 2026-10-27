import type { ReactNode } from 'react'
import { Card } from '../design-system'
import { Marca } from './Marca'
import './layouts.css'

interface Props {
  titulo: string
  subtitulo?: string
  children: ReactNode
  rodape?: ReactNode
}

export function LayoutAuth({ titulo, subtitulo, children, rodape }: Props) {
  return (
    <div className="qz-auth">
      <div className="qz-auth__caixa">
        <div className="qz-auth__cabecalho">
          <Marca para="/" />
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        <Card>{children}</Card>
        {rodape && <div className="qz-auth__rodape">{rodape}</div>}
        <div className="qz-auth__rodape">
          <a href="/termos">Termos de Uso</a> · <a href="/privacidade">Política de Privacidade</a>
        </div>
      </div>
    </div>
  )
}
