# 012 — Correção e consolidação de nota

- **Status:** Concluída com pendências
- **Sprint:** 3 · **Responsável:** Dev B (API), Dev C (tela)
- **Requisitos:** RF07 · **ADRs:** [0018](../adr/0018-correcao-snapshot-e-consolidacao.md), [0021](../adr/0021-escopo-de-acesso-por-papel.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Sistema | Prova só com fechadas é enviada | Nota consolidada na hora; aluno notificado; comprovante já mostra a nota |
| UC2 | Sistema | Prova com aberta é enviada | `PENDENTE_CORRECAO_MANUAL` com nota provisória; entra na fila |
| UC3 | Corretor/professor | Corrige aberta (0–100% + feedback) | Ao corrigir a última, consolida, aplica o critério e notifica o aluno |
| UC4 | Corretor | Tenta mudar nota já consolidada | `409` — só por recurso |
| UC5 | Aluno | Vê o resultado | Nota, situação por questão (correta/parcial/incorreta) e feedback, **sem gabarito** |

## Interface

| Método | Rota | Acesso |
|---|---|---|
| GET | `/api/v1/correcao/pendentes` | Correção (Corretor vê tudo; Professor, as próprias provas) |
| GET | `/api/v1/correcao/notas?provaId&aplicacaoId` · `/notas/:id` | Correção |
| POST | `/api/v1/correcao/notas/:id/questoes/:versaoQuestaoId` `{ percentual, feedback? }` | Correção |
| GET | `/api/v1/aluno/resultados` · `/aluno/resultados/:id` | Aluno |

Telas: `/app/correcoes`, `/app/correcoes/:notaId`; `/aluno/resultados`, `/aluno/resultados/:id`.
Numa questão ainda não corrigida, a pontuação (percentual inteiro ou pontos por critério) começa **em branco**:
"Salvar correção" só habilita com tudo preenchido ([BUG-029](../bugs-corrigidos.md#bug-029)).

## Testes

- `apps/api/src/modules/correcao/calculo.spec.ts` (ponderação, pendente, parcial, anulações, arredondamento).
- `fluxo-completo.e2e-spec.ts` (nota provisória 6 → correção 50% → final 8 → aprovado; bloqueio após consolidar).

## Pendências e limitações

- [x] Bloqueio de consolidação em prova mista; corretores designados por prova — lote 8, [033](033-correcao-avancada-e-formatos-estruturados.md).
- [ ] Sugestão de nota via IA (fora do MVP).
- [x] Política configurável de exibição de gabarito ao aluno — lote 6, [024](024-politicas-impressao-e-comportamento.md).
- [x] Rubrica com critérios pontuados e correção às cegas — lote 8. - [ ] Dupla correção.

## Arquivos principais

- API: `apps/api/src/modules/correcao/*` · Web: `paginas/profissional/correcao/*`, `paginas/aluno/Resultados.tsx`
