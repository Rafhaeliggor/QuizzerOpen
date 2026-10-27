import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { CabecalhoPagina } from '../componentes/CabecalhoPagina'
import { authFalso, ComAuth, usuarioFalso } from '../test/auth-falso'
import { LayoutProfissional } from './LayoutProfissional'

vi.mock('../componentes/SinoNotificacoes', () => ({ SinoNotificacoes: () => null }))

function renderizar(caminho: string, papel: 'PROFESSOR' | 'ADMINISTRADOR' = 'PROFESSOR') {
  const sair = vi.fn()
  const roteador = createMemoryRouter(
    [
      {
        path: '/app',
        element: <LayoutProfissional />,
        children: [
          { index: true, element: <CabecalhoPagina titulo="Bom dia, Ana" /> },
          { path: 'questoes', element: <CabecalhoPagina titulo="Banco de questões" /> },
          { path: 'questoes/:id', element: <CabecalhoPagina titulo="MAT-001" /> },
        ],
      },
    ],
    { initialEntries: [caminho] },
  )
  render(
    <ComAuth valor={authFalso({ estado: 'autenticado', usuario: usuarioFalso({ papel }), sair })}>
      <RouterProvider router={roteador} />
    </ComAuth>,
  )
  return { sair }
}

describe('LayoutProfissional', () => {
  it('mostra o menu do papel e a trilha da seção atual', () => {
    renderizar('/app/questoes')
    const menu = screen.getByRole('navigation', { name: 'Menu principal' })
    expect(menu).toHaveTextContent('Banco de Questões')
    expect(menu).not.toHaveTextContent('Auditoria')
    const trilha = screen.getByRole('navigation', { name: 'Você está em' })
    expect(trilha).toHaveTextContent('Unima/Banco de Questões')
  })

  it('em subpágina, a trilha liga a seção e mostra o título da página', async () => {
    renderizar('/app/questoes/q1')
    const trilha = screen.getByRole('navigation', { name: 'Você está em' })
    expect(await screen.findByText('MAT-001', { selector: '[aria-current]' })).toBeInTheDocument()
    expect(trilha.querySelector('a')).toHaveAttribute('href', '/app/questoes')
  })

  it('administrador vê os itens de administração', () => {
    renderizar('/app', 'ADMINISTRADOR')
    expect(screen.getByRole('link', { name: 'Auditoria' })).toBeInTheDocument()
  })

  it('o menu do usuário permite sair', async () => {
    const { sair } = renderizar('/app')
    await userEvent.click(screen.getByRole('button', { name: 'Menu de Ana Souza' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sair' }))
    expect(sair).toHaveBeenCalled()
  })
})
