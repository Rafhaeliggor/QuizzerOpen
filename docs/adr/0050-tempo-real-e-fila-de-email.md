# ADR-0050: Notificações em tempo real (SSE) e fila de e-mail com retentativa

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A (API), Dev B (Nginx), Dev C (cliente)
- **Requisitos relacionados:** RF10, RNF03

## Decisão

- **SSE** em `GET /notificacoes/fluxo`: o servidor envia só um **sinal** ("há notificação nova");
  o navegador recarrega a lista pela rota normal. Sinais passam pelo **Redis pub/sub** (várias
  instâncias da API) com reserva local se o Redis falhar.
- O fluxo **fecha a cada 60 s**: o cliente reconecta e o guard revalida sessão e token — revogação
  continua valendo (ADR-0027) sem lógica extra. Pulso a cada 20 s; `X-Accel-Buffering: no` e
  `proxy_buffering off` no Nginx.
- O cliente usa `fetch` com `Authorization` (EventSource não envia cabeçalhos); reconexão com espera
  crescente até 1 min; a consulta periódica de reserva passou de 1 para 5 min.
- **Fila de e-mail** (`notificacoes.emails_pendentes`): cópias de notificação tentam na hora e, se
  falharem, ficam na fila com espera 1, 2, 4, 8, 16, 32 min (6 tentativas); depois ficam 7 dias para
  diagnóstico. **E-mails com link de acesso (senha/convite) não entram na fila** — o token não fica
  guardado em texto no banco (ADR-0041).

## Alternativas consideradas

- **WebSocket** — bidirecional desnecessário; SSE passa por proxies HTTP comuns.
- **Token na query string do EventSource** — vazaria em logs de acesso.
