import { definirAccessToken } from './cliente'
import { escutarNotificacoes } from './fluxo'

function corpo(partes: string[]) {
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const p of partes) c.enqueue(new TextEncoder().encode(p))
      c.close()
    },
  })
}

describe('fluxo de notificações (SSE — lote 8)', () => {
  afterEach(() => vi.restoreAllMocks())

  it('envia o token, ignora pulsos e chama o callback a cada notificação (inclusive dividida em pedaços)', async () => {
    definirAccessToken('token-1')
    let chamadas = 0
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      chamadas++
      if (chamadas > 1) return new Promise<Response>(() => {}) // segunda conexão fica aberta
      return new Response(corpo(['event: pronto\ndata: {}\n\n', 'event: pulso\ndata: {}\n\nevent: notif', 'icacao\ndata: {"titulo":"x"}\n\n']), {
        headers: { 'Content-Type': 'text/event-stream' },
      })
    })
    const aoSinal = vi.fn()
    const parar = escutarNotificacoes(aoSinal)
    await vi.waitFor(() => expect(aoSinal).toHaveBeenCalledTimes(1))
    expect((fetch.mock.calls[0]![1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer token-1' })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)) // reconecta quando o servidor fecha
    parar()
    definirAccessToken(null)
  })
})
