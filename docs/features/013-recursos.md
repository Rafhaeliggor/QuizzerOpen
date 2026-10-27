# 013 — Recursos e contestações

- **Status:** Concluída com pendências
- **Sprint:** 4 · **Responsável:** Dev B (API), Dev C (telas)
- **Requisitos:** RF08 · **ADRs:** [0018](../adr/0018-correcao-snapshot-e-consolidacao.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Aluno | Contesta uma questão do seu resultado (justificativa) | Recurso **Aberto**; autor da prova notificado |
| UC2 | Aluno | Contesta a mesma questão de novo | `409` |
| UC3 | Professor | Marca "em análise" | **Em análise** |
| UC4 | Professor | Indefere com justificativa | Nota mantida; aluno notificado com a justificativa |
| UC5 | Professor | Defere com ajuste individual (%) | Nota do aluno recalculada |
| UC6 | Professor | Defere anulando a questão (pontuar a todos / remover do total) | **Todas** as notas da prova com a questão são reprocessadas; afetados notificados; outros recursos da mesma questão resolvidos |

## Interface

| Método | Rota | Acesso |
|---|---|---|
| GET/POST | `/api/v1/aluno/recursos` (`{ notaId, versaoQuestaoId, justificativa }`) | Aluno |
| GET | `/api/v1/recursos?status` · `/recursos/:id` | Autoria |
| POST | `/api/v1/recursos/:id/analisar` | Autoria |
| POST | `/api/v1/recursos/:id/decidir` `{ deferido, decisao, efeito?, percentual?, politica? }` | Autoria |

Telas: `/aluno/resultados/:id` (botão "Contestar esta questão"), `/aluno/recursos`; `/app/recursos`, `/app/recursos/:id`.

## Testes

- `fluxo-completo.e2e-spec.ts`: recurso duplicado, análise, deferimento com anulação `PONTUAR_TODOS` (nota 8 → 10), auditoria do recurso.
- Navegador: aluno contesta, professora defere com ajuste, aluno recebe notificação.

## Pendências e limitações

- [x] Prazo para recurso configurável por prova — lote 6, [024](024-politicas-impressao-e-comportamento.md).
- [x] Encaminhamento à coordenação — lote 8, [033](033-correcao-avancada-e-formatos-estruturados.md). - [ ] Colegiado com votação.
- [ ] Recurso por participante externo (sem conta, não há como acompanhar).

## Arquivos principais

- API: `apps/api/src/modules/recursos/*`, `CorrecaoService.{ajustarQuestao,anularQuestao}` · Web: `paginas/profissional/recursos/*`
