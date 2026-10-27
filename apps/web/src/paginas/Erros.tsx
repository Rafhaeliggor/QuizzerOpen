import { Link } from 'react-router'
import { LayoutAuth } from '../layouts/LayoutAuth'

export function NaoEncontrado() {
  return (
    <LayoutAuth titulo="Página não encontrada" rodape={<Link to="/">Voltar ao início</Link>}>
      O endereço acessado não existe.
    </LayoutAuth>
  )
}

export function AcessoNegado() {
  return (
    <LayoutAuth titulo="Acesso negado" rodape={<Link to="/">Voltar ao início</Link>}>
      Seu perfil não tem permissão para acessar esta página.
    </LayoutAuth>
  )
}
