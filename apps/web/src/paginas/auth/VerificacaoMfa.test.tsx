import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { UsuarioSessao } from '../../api/tipos'
import type { PendenciaMfa } from '../../auth/contexto'
import { authFalso, ComAuth, usuarioFalso } from '../../test/auth-falso'
import { VerificacaoMfa } from './VerificacaoMfa'

/** Provedor com estado real: verificar o código autentica e limpa a pendência. */
function ProvedorSimulado({ children, tipo }: { children: React.ReactNode; tipo: PendenciaMfa['tipo'] }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null)
  const [pendencia, setPendencia] = useState<PendenciaMfa | null>({ mfaToken: 't', tipo, ambiente: 'PROFISSIONAL' })
  const valor = authFalso({
    usuario,
    pendenciaMfa: pendencia,
    estado: usuario ? 'autenticado' : 'anonimo',
    iniciarCadastroMfa: vi.fn().mockResolvedValue({ otpauthUri: 'otpauth://x', qrCodeDataUrl: 'data:image/png;base64,AA', segredo: 'ABC123' }),
    verificarMfa: vi.fn(async () => {
      setUsuario(usuarioFalso({ papel: 'ADMINISTRADOR', mfaHabilitado: true }))
      setPendencia(null)
    }),
  })
  return <ComAuth valor={valor}>{children}</ComAuth>
}

function renderizar(tipo: PendenciaMfa['tipo']) {
  const roteador = createMemoryRouter(
    [
      { path: '/mfa', element: <VerificacaoMfa /> },
      { path: '/login', element: <p>login</p> },
      { path: '/app/usuarios', element: <p>destino original</p> },
    ],
    { initialEntries: [{ pathname: '/mfa', state: { de: '/app/usuarios' } }] },
  )
  render(
    <ProvedorSimulado tipo={tipo}>
      <RouterProvider router={roteador} />
    </ProvedorSimulado>,
  )
}

describe('VerificacaoMfa', () => {
  it('após o código correto vai para a rota original (e não volta ao login)', async () => {
    renderizar('MFA_REQUERIDO')
    await userEvent.type(screen.getByLabelText('Código de verificação'), '123456')
    await userEvent.click(screen.getByRole('button', { name: 'Verificar' }))
    expect(await screen.findByText('destino original')).toBeInTheDocument()
  })

  it('no cadastro, exibe QR code e chave manual', async () => {
    renderizar('MFA_CADASTRO_REQUERIDO')
    expect(await screen.findByAltText(/QR code/)).toBeInTheDocument()
    expect(screen.getByText('ABC123')).toBeInTheDocument()
  })

  it('sem verificação pendente, volta ao login', () => {
    const roteador = createMemoryRouter(
      [
        { path: '/mfa', element: <VerificacaoMfa /> },
        { path: '/login', element: <p>login</p> },
      ],
      { initialEntries: ['/mfa'] },
    )
    render(
      <ComAuth valor={authFalso()}>
        <RouterProvider router={roteador} />
      </ComAuth>,
    )
    expect(screen.getByText('login')).toBeInTheDocument()
  })
})

describe('VerificacaoMfa sem pendência (página recarregada)', () => {
  it('volta ao login do ambiente de origem', () => {
    const roteador = createMemoryRouter(
      [
        { path: '/mfa', element: <VerificacaoMfa /> },
        { path: '/login', element: <p>login profissional</p> },
        { path: '/aluno/login', element: <p>login do aluno</p> },
      ],
      { initialEntries: [{ pathname: '/mfa', state: { ambiente: 'ALUNO' } }] },
    )
    render(
      <ComAuth valor={authFalso({ usuario: null, pendenciaMfa: null, estado: 'anonimo' })}>
        <RouterProvider router={roteador} />
      </ComAuth>,
    )
    expect(screen.getByText('login do aluno')).toBeInTheDocument()
  })
})
