import { obterAccessToken, renovarSessao } from './cliente'

/**
 * Escuta o fluxo de notificações (SSE — ADR-0050) com fetch (o EventSource não envia o header
 * Authorization). O servidor fecha a cada 60 s; aqui reconectamos sozinhos, renovando o token
 * em 401 e esperando mais a cada falha seguida (até 1 min). Retorna a função para parar.
 */
export function escutarNotificacoes(aoSinal: () => void): () => void {
  let parado = false
  let controle: AbortController | null = null
  let falhas = 0

  const ciclo = async () => {
    while (!parado) {
      controle = new AbortController()
      try {
        let token = obterAccessToken()
        if (!token) token = await renovarSessao()
        if (!token) throw new Error('sem sessão')
        const res = await fetch('/api/v1/notificacoes/fluxo', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: controle.signal,
        })
        if (res.status === 401) {
          await renovarSessao()
          throw new Error('401')
        }
        if (!res.ok || !res.body) throw new Error(String(res.status))
        falhas = 0
        const leitor = res.body.getReader()
        const decodificador = new TextDecoder()
        let resto = ''
        for (;;) {
          const { value, done } = await leitor.read()
          if (done) break
          resto += decodificador.decode(value, { stream: true })
          const blocos = resto.split('\n\n')
          resto = blocos.pop() ?? ''
          if (blocos.some((b) => b.includes('event: notificacao'))) aoSinal()
        }
      } catch {
        if (parado) return
        falhas++
        await new Promise((r) => setTimeout(r, Math.min(60_000, 1000 * 2 ** falhas)))
      }
    }
  }
  void ciclo()
  return () => {
    parado = true
    controle?.abort()
  }
}
