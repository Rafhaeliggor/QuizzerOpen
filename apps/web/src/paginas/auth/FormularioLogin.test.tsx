import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { ErroApi } from '../../api/cliente'
import type { ValorAuth } from '../../auth/contexto'
import { authFalso, ComAuth, usuarioFalso } from '../../test/auth-falso'
import { FormularioLogin } from './FormularioLogin'

function renderizar(entrar: ValorAuth['entrar']) {
  const roteador = createMemoryRouter(
    [
      { path: '/login', element: <FormularioLogin ambiente="PROFISSIONAL" /> },
      { path: '/mfa', element: <p>tela mfa</p> },
      { path: '/app', element: <p>painel</p> },
    ],
    { initialEntries: ['/login'] },
  )
  render(
    <ComAuth valor={authFalso({ entrar })}>
      <RouterProvider router={roteador} />
    </ComAuth>,
  )
}

async function preencherEEnviar() {
  await userEvent.type(screen.getByLabelText('E-mail'), 'admin@quizzer.local')
  await userEvent.type(screen.getByLabelText('Senha'), 'SenhaForte123')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('FormularioLogin', () => {
  it('redireciona para o MFA quando o papel exige segundo fator', async () => {
    const entrar = vi.fn().mockResolvedValue('MFA')
    renderizar(entrar)
    await preencherEEnviar()
    expect(entrar).toHaveBeenCalledWith('PROFISSIONAL', 'admin@quizzer.local', 'SenhaForte123')
    expect(await screen.findByText('tela mfa')).toBeInTheDocument()
  })

  it('com sessão ativa, segue para a área do ambiente', () => {
    const roteador = createMemoryRouter(
      [
        { path: '/login', element: <FormularioLogin ambiente="PROFISSIONAL" /> },
        { path: '/app', element: <p>painel</p> },
      ],
      { initialEntries: ['/login'] },
    )
    render(
      <ComAuth valor={authFalso({ estado: 'autenticado', usuario: usuarioFalso() })}>
        <RouterProvider router={roteador} />
      </ComAuth>,
    )
    expect(screen.getByText('painel')).toBeInTheDocument()
  })

  it('exibe o erro da API e limpa a senha', async () => {
    renderizar(vi.fn().mockRejectedValue(new ErroApi(401, { message: 'Credenciais inválidas' })))
    await preencherEEnviar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas')
    expect(screen.getByLabelText('Senha')).toHaveValue('')
  })

  it('traduz rate limit (429) em mensagem amigável', async () => {
    renderizar(vi.fn().mockRejectedValue(new ErroApi(429, { message: 'ThrottlerException' })))
    await preencherEEnviar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas')
  })
})
