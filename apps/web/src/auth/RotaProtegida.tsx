import { Navigate, Outlet, useLocation } from 'react-router'
import type { Ambiente, Papel } from '../api/tipos'
import { Spinner } from '../design-system'
import { rotaInicial, rotaLogin, useAuth } from './contexto'

interface Props {
  ambiente: Ambiente
  papeis?: Papel[]
  /** Permissão delegada que também libera o grupo (RF02). */
  permissao?: string
}

/**
 * Protege um grupo de rotas por ambiente e (opcionalmente) por papel.
 * A autorização real é feita pela API; aqui é apenas experiência de navegação.
 */
export function RotaProtegida({ ambiente, papeis, permissao }: Props) {
  const { estado, usuario } = useAuth()
  const local = useLocation()

  if (estado === 'carregando') return <Spinner rotulo="Verificando sessão…" telaCheia />
  if (!usuario) return <Navigate to={rotaLogin(ambiente)} replace state={{ de: local.pathname }} />

  // Usuário logado no outro ambiente: manda para a área dele.
  if (usuario.ambiente !== ambiente) return <Navigate to={rotaInicial(usuario.ambiente)} replace />

  if (usuario.trocarSenha) return <Navigate to="/trocar-senha" replace />

  const delegado = !!permissao && !!usuario.permissoes?.includes(permissao)
  if (papeis && !papeis.includes(usuario.papel) && !delegado) return <Navigate to="/acesso-negado" replace />

  return <Outlet />
}
