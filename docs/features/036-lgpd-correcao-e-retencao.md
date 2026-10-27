# 036 — LGPD: pedido de correção de dados e retenção de externos

- **Status:** Concluída (MVP)
- **Sprint:** 9 (lote 8) · **Responsável:** Dev A, Dev C
- **Requisitos:** RNF05 · **ADRs:** [0052](../adr/0052-lgpd-correcao-e-retencao.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Aluno | *Minha conta → Pedir correção de dados* (nome) | Pedido em análise; administração avisada |
| 2 | Admin | *LGPD → Aplicar correção* | Nome corrigido na conta e nas notas; auditoria sem o valor |
| 3 | TI | `RETENCAO_EXTERNOS_DIAS=365` | Diariamente, externos com prova há mais de 1 ano ficam anônimos |

## Testes

`test/integracao-e-operacao.e2e-spec.ts` (correção aplicada nas notas; retenção desligada/ligada).

## Pendências e limitações

- [ ] Prazo de retenção para alunos com conta (decisão institucional).
