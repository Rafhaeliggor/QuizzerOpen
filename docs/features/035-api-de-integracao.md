# 035 — API de integração com sistemas acadêmicos

- **Status:** Concluída (MVP)
- **Sprint:** 9 (lote 8) · **Responsável:** Dev A, Dev C
- **Requisitos:** RNF01 · **ADRs:** [0051](../adr/0051-api-de-integracao.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Admin | *Integrações → Nova chave* "ERP" com `turmas:escrever` e `notas:ler` | Token mostrado uma vez |
| 2 | ERP | `PUT /integracao/v1/turmas/CALC1-2026.2` com professor e alunos | Turma criada, contas criadas com convite, matrículas |
| 3 | ERP | Mesmo PUT sem um aluno, `removerAusentes: true` | Aluno desvinculado (histórico mantido) |
| 4 | ERP | `GET /integracao/v1/notas?desde=…` | Resultados consolidados com e-mail/matrícula, por páginas |
| 5 | Admin | Revoga a chave | Próxima chamada → 401 |

Guia técnico: [operacao/integracao.md](../operacao/integracao.md).

## Testes

`test/integracao-e-operacao.e2e-spec.ts` (criação, escopo, revogação, sincronização, cursor).

## Pendências e limitações

- [ ] Webhooks de saída (avisar o ERP quando sai uma nota).
- [ ] Importar provas/questões (QTI).
