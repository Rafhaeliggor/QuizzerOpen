import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { ValorAuth } from './contexto'
import { RotaProtegida } from './RotaProtegida'
import { authFalso, ComAuth, usuarioFalso } from '../test/auth-falso'

function renderizar(auth: ValorAuth, caminho: string) {
  const roteador = createMemoryRouter(
    [
      { path: '/login', element: <p>login profissional</p> },
      { path: '/aluno/login', element: <p>login aluno</p> },
      { path: '/trocar-senha', element: <p>trocar senha</p> },
      { path: '/acesso-negado', element: <p>acesso negado</p> },
      { path: '/aluno', element: <p>painel aluno</p> },
      {
        path: '/app',
        element: <RotaProtegida ambiente="PROFISSIONAL" />,
        children: [{ index: true, element: <p>painel profissional</p> }],
      },
      {
        path: '/app/usuarios',
        element: <RotaProtegida ambiente="PROFISSIONAL" papeis={['ADMINISTRADOR']} />,
        children: [{ index: true, element: <p>usuarios</p> }],
      },
    ],
    { initialEntries: [caminho] },
  )
  render(
    <ComAuth valor={auth}>
      <RouterProvider router={roteador} />
    </ComAuth>,
  )
}

describe('RotaProtegida', () => {
  it('anônimo vai para o login do ambiente', () => {
    renderizar(authFalso(), '/app')
    expect(screen.getByText('login profissional')).toBeInTheDocument()
  })

  it('aguarda a restauração da sessão antes de decidir', () => {
    renderizar(authFalso({ estado: 'carregando' }), '/app')
    expect(screen.getByRole('status')).toHaveTextContent('Verificando sessão')
  })

  it('aluno tentando acessar o ambiente profissional vai para a área do aluno', () => {
    renderizar(
      authFalso({ estado: 'autenticado', usuario: usuarioFalso({ papel: 'ALUNO', ambiente: 'ALUNO' }) }),
      '/app',
    )
    expect(screen.getByText('painel aluno')).toBeInTheDocument()
  })

  it('troca de senha pendente força a tela de troca', () => {
    renderizar(authFalso({ estado: 'autenticado', usuario: usuarioFalso({ trocarSenha: true }) }), '/app')
    expect(screen.getByText('trocar senha')).toBeInTheDocument()
  })

  it('papel sem permissão vai para acesso negado', () => {
    renderizar(authFalso({ estado: 'autenticado', usuario: usuarioFalso() }), '/app/usuarios')
    expect(screen.getByText('acesso negado')).toBeInTheDocument()
  })

  it('usuário autorizado vê o conteúdo', () => {
    renderizar(authFalso({ estado: 'autenticado', usuario: usuarioFalso() }), '/app')
    expect(screen.getByText('painel profissional')).toBeInTheDocument()
  })
})
