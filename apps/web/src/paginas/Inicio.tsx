import { Navigate } from 'react-router'
import { rotaInicial, useAuth } from '../auth/contexto'
import { Spinner } from '../design-system'
import { Homepage } from './home/Homepage'

/** "/" mostra a homepage para visitantes e leva quem está logado para a área do seu ambiente. */
export function Inicio() {
  const { estado, usuario } = useAuth()
  if (estado === 'carregando') return <Spinner telaCheia />
  if (!usuario) return <Homepage />
  return <Navigate to={rotaInicial(usuario.ambiente)} replace />
}
