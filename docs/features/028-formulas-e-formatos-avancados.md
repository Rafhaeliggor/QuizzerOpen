# 028 — Fórmulas, várias corretas, resposta numérica e versões nas provas

- **Status:** Concluída (MVP)
- **Sprint:** 8 (lote 7) · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF04, RF06, RF07 · **ADRs:** [0047](../adr/0047-formulas-e-novos-formatos.md), [0032](../adr/0032-midias-em-volume-local.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | Escreve `\(x^2\)` no enunciado | Pré-visualização no editor; fórmula renderizada na prova, resultado, correção e impressão |
| 2 | Professor | Cria "Várias corretas" com A e C | Aluno que marca só A recebe 50%; A+B recebe 0; A+C recebe 100% |
| 3 | Professor | Cria numérica 3,14 ± 0,005 | "3,141" e "3.14" acertam; "3,2" erra |
| 4 | Aluno | Vê o resultado | Mídias da questão aparecem no resultado (snapshot) |
| 5 | Professor | Abre rascunho de prova cuja questão ganhou versão nova | Aviso + *Usar as versões mais novas* |
| 6 | Sistema | Upload nunca usado há 24 h | Removido pela limpeza periódica (6 h) |

## Interface

- `formato`: `MULTIPLA_RESPOSTA` (campo `alternativasCorretas: number[]`), `RESPOSTA_NUMERICA`
  (`valorNumerico`, `tolerancia`). Resposta: `{ alternativaIds: [] }` ou `{ texto }` (até 50 caracteres).
- `POST /provas/:id/atualizar-versoes` (rascunho); `GET /provas/:id` traz `versaoMaisNova` por item.

## Testes

`calculo.spec.ts` (parcial, leitura de número, tolerância), `TextoRico.test.tsx` (separação, MathML
sem estilo/links, texto não vira HTML), `ExecucaoProva.test.tsx`, `test/formatos-e-aplicacao.e2e-spec.ts`,
Playwright `recursos-avancados.spec.ts` (fórmula e várias corretas).

## Pendências e limitações

- [ ] Editor visual de fórmulas (hoje LaTeX digitado com pré-visualização).
- [x] ~~Associação (colunas) e ordenação~~ — lote 8 ([033](033-correcao-avancada-e-formatos-estruturados.md)).
