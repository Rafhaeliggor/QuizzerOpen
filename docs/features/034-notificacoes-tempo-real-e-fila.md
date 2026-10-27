# 034 — Notificações em tempo real e fila de e-mail

- **Status:** Concluída (MVP)
- **Sprint:** 9 (lote 8) · **Responsável:** Dev A, Dev B, Dev C
- **Requisitos:** RF10, RNF03 · **ADRs:** [0050](../adr/0050-tempo-real-e-fila-de-email.md)

## Funcionamento

O sino abre um fluxo SSE (`/api/v1/notificacoes/fluxo`) e recarrega a lista quando chega um sinal
— sem esperar o minuto da consulta. O fluxo dura 60 s e reconecta sozinho. Cópias por e-mail das
notificações passam pela fila com até 6 tentativas.

## Testes

`test/integracao-e-operacao.e2e-spec.ts` (sinal só para o dono, 401 sem token, fila com retentativa),
`api/fluxo.test.ts` (cliente: token, pulsos, eventos divididos, reconexão).

## Pendências e limitações

- [ ] Push no celular (🚫).
