import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { SinoNotificacoes } from './SinoNotificacoes'

vi.mock('../api/fluxo', () => ({ escutarNotificacoes: () => () => undefined }))

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })

describe('SinoNotificacoes', () => {
  afterEach(() => vi.restoreAllMocks())

  it('falha ao marcar todas como lidas aparece no painel (BUG-059)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) =>
      init?.method === 'POST'
        ? json({ message: 'Serviço indisponível' }, 503)
        : json({ naoLidas: 1, itens: [{ id: 'n1', titulo: 'Nova prova', mensagem: 'm', lida: false, criadoEm: '2026-10-27T12:00:00Z', link: null }] }),
    )
    const cliente = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(
      <QueryClientProvider client={cliente}>
        <MemoryRouter>
          <SinoNotificacoes />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await userEvent.click(await screen.findByRole('button', { name: /Notificações \(1 não lidas\)/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Marcar todas como lidas' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível marcar como lida')
  })
})
