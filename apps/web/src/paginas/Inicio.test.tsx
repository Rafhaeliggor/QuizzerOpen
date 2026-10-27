import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { ValorAuth } from '../auth/contexto'
import { authFalso, ComAuth, usuarioFalso } from '../test/auth-falso'
import { Inicio } from './Inicio'

function renderizar(auth: ValorAuth) {
  const roteador = createMemoryRouter(
    [
      { path: '/', element: <Inicio /> },
      { path: '/app', element: <p>painel profissional</p> },
      { path: '/aluno', element: <p>painel aluno</p> },
    ],
    { initialEntries: ['/'] },
  )
  render(
    <ComAuth valor={auth}>
      <RouterProvider router={roteador} />
    </ComAuth>,
  )
}

describe('Inicio', () => {
  it('visitante vê a homepage com os três acessos', () => {
    renderizar(authFalso())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Do banco de questões ao resultado')
    expect(screen.getAllByRole('link', { name: 'Entrar como professor' })[0]).toHaveAttribute('href', '/login')
    expect(screen.getAllByRole('link', { name: 'Sou aluno' })[0]).toHaveAttribute('href', '/aluno/login')
    expect(screen.getAllByRole('link', { name: 'Tenho um PIN' })[0]).toHaveAttribute('href', '/p')
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos')
  })

  it('profissional logado vai direto para o painel', () => {
    renderizar(authFalso({ estado: 'autenticado', usuario: usuarioFalso() }))
    expect(screen.getByText('painel profissional')).toBeInTheDocument()
  })

  it('aluno logado vai para a área do aluno', () => {
    renderizar(authFalso({ estado: 'autenticado', usuario: usuarioFalso({ papel: 'ALUNO', ambiente: 'ALUNO' }) }))
    expect(screen.getByText('painel aluno')).toBeInTheDocument()
  })
})
