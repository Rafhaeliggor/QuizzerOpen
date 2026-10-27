import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { EsqueciSenha, RedefinirSenha } from './RecuperarSenha'

function montar(ui: React.ReactNode, rota = '/') {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={cliente}>
      <MemoryRouter initialEntries={[rota]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('Recuperação de senha (ADR-0041)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sem e-mail configurado, orienta procurar a secretaria', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ emailHabilitado: false }))
    montar(<EsqueciSenha ambiente="ALUNO" />)
    expect(await screen.findByText(/não está configurado/)).toBeInTheDocument()
  })

  it('envia o pedido e mostra a mensagem neutra', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) =>
      String(url).endsWith('/auth/recursos')
        ? respostaJson({ emailHabilitado: true })
        : respostaJson({ mensagem: 'Se houver uma conta com este e-mail, enviaremos um link.' }),
    )
    montar(<EsqueciSenha ambiente="PROFISSIONAL" />)
    await userEvent.type(await screen.findByLabelText('E-mail'), 'ana@escola.br')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar link' }))
    expect(await screen.findByText(/Se houver uma conta/)).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/v1/auth/senha/esqueci', expect.objectContaining({ method: 'POST' }))
  })

  it('redefinição exige senha forte e confirmação igual', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respostaJson({ mensagem: 'Senha redefinida.' }))
    montar(<RedefinirSenha ambiente="ALUNO" />, `/?token=${'a'.repeat(43)}`)
    const salvar = screen.getByRole('button', { name: 'Salvar nova senha' })
    await userEvent.type(screen.getByLabelText('Nova senha'), 'semnumeros')
    expect(salvar).toBeDisabled()
    await userEvent.clear(screen.getByLabelText('Nova senha'))
    await userEvent.type(screen.getByLabelText('Nova senha'), 'SenhaForte2026')
    await userEvent.type(screen.getByLabelText('Repita a nova senha'), 'SenhaForte2026')
    await userEvent.click(salvar)
    await waitFor(() => expect(screen.getByText(/Senha redefinida/)).toBeInTheDocument())
    const corpo = JSON.parse(String((fetch.mock.calls[0]![1] as RequestInit).body)) as { token: string }
    expect(corpo.token).toBe('a'.repeat(43))
  })
})
