import type { ReactNode } from 'react'
import { Icone } from './Icone'

interface Props {
  tipo?: 'info' | 'sucesso' | 'alerta' | 'erro'
  titulo?: string
  children: ReactNode
}

/** Mensagem de destaque (erros de formulário, avisos de prazo, confirmações). */
export function AlertBanner({ tipo = 'info', titulo, children }: Props) {
  return (
    <div className={`qz-alerta qz-alerta--${tipo}`} role={tipo === 'erro' || tipo === 'alerta' ? 'alert' : 'status'}>
      <Icone nome={tipo === 'sucesso' ? 'check-circulo' : 'info'} className="qz-alerta__icone" />
      <div>
        {titulo && <div className="qz-alerta__titulo">{titulo}</div>}
        <div>{children}</div>
      </div>
    </div>
  )
}
