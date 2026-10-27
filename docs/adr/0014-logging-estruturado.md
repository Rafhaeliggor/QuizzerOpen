# ADR-0014: Logging estruturado em JSON (pino)

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev B
- **Requisitos relacionados:** plano (Sprint 1 — logging estruturado básico), RNF05

## Decisão

- **nestjs-pino** como logger da aplicação e de requisições HTTP.
- Em produção/CI: **JSON puro em stdout** (coletado pelo Docker com rotação — ADR-0008).
  Em desenvolvimento: `pino-pretty` em linha única.
- Log de requisição **enxuto**: apenas `id`, `method`, `url` e `statusCode` (+ tempo).
  Cabeçalhos não são registrados (evita vazar `Authorization`, cookies e dados pessoais).
- `/api/v1/health` não gera log de requisição (ruído do healthcheck).
- Nível por `LOG_LEVEL` (padrão `info`).
- Eventos de segurança relevantes (ex.: conta bloqueada) são logados em `warn` com o id do
  usuário — **não** com e-mail.

## Consequências

- PENDENTE (Sprint 3): centralização de logs (volume/coletor) e verificação de uptime.
- PENDENTE (Sprint 4): auditoria imutável (RF11) é **separada** do log técnico — tabela própria.
