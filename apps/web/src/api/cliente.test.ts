import { api, definirAccessToken, ErroApi, registrarAoExpirarSessao } from './cliente'

function resposta(status: number, corpo?: unknown) {
  return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('cliente da API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    definirAccessToken(null)
  })

  it('envia o access token e converte erro em ErroApi', async () => {
    const fetchFalso = vi.fn().mockResolvedValue(resposta(403, { message: 'Permissão insuficiente' }))
    vi.stubGlobal('fetch', fetchFalso)
    definirAccessToken('tok')
    await expect(api('/usuarios')).rejects.toMatchObject({ status: 403, message: 'Permissão insuficiente' })
    expect(fetchFalso.mock.calls[0]![1].headers.Authorization).toBe('Bearer tok')
  })

  it('em 401 renova a sessão uma única vez para requisições simultâneas e repete', async () => {
    let renovacoes = 0
    const fetchFalso = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        renovacoes++
        return resposta(200, { accessToken: 'novo' })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === 'Bearer novo' ? resposta(200, { ok: true }) : resposta(401, { message: 'expirado' })
    })
    vi.stubGlobal('fetch', fetchFalso)
    definirAccessToken('velho')

    const resultados = await Promise.all([api('/a'), api('/b'), api('/c')])
    expect(resultados).toEqual([{ ok: true }, { ok: true }, { ok: true }])
    expect(renovacoes).toBe(1)
  })

  it('encerra a sessão local quando a renovação falha', async () => {
    const expirou = vi.fn()
    registrarAoExpirarSessao(expirou)
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => (url.endsWith('/auth/refresh') ? resposta(401) : resposta(401, { message: 'x' }))),
    )
    definirAccessToken('velho')
    await expect(api('/a')).rejects.toBeInstanceOf(ErroApi)
    expect(expirou).toHaveBeenCalledOnce()
  })
})
