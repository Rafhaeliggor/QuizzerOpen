import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { definirAccessToken } from '../api/cliente'
import { useAuth } from './contexto'
import { ProvedorAuth } from './ProvedorAuth'

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
}

function Sair() {
  const { estado, sair } = useAuth()
  return (
    <>
      <p>{estado}</p>
      <button onClick={() => void sair()}>Sair</button>
    </>
  )
}

describe('ProvedorAuth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    definirAccessToken(null)
  })

  it('logout com access token vencido renova e revoga a sessão no servidor', async () => {
    let refresh = 0
    const logouts: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
        if (url.endsWith('/auth/refresh')) return resposta(200, { accessToken: `tok${++refresh}` })
        if (url.endsWith('/auth/me')) return resposta(200, { id: 'u1', nome: 'Ana', papel: 'PROFESSOR', ambiente: 'PROFISSIONAL', permissoes: [] })
        if (url.endsWith('/auth/logout')) {
          logouts.push(auth ?? '')
          return auth === 'Bearer tok1' ? resposta(401, { message: 'expirado' }) : resposta(204)
        }
        return resposta(404)
      }),
    )
    render(
      <ProvedorAuth>
        <Sair />
      </ProvedorAuth>,
    )
    expect(await screen.findByText('autenticado')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    await waitFor(() => expect(screen.getByText('anonimo')).toBeInTheDocument())
    expect(logouts).toEqual(['Bearer tok1', 'Bearer tok2']) // 2ª tentativa, com token renovado, revogou de fato
  })
})
