# 032 — Seções, sorteio de questões e nota mínima por seção

- **Status:** Concluída (MVP)
- **Sprint:** 9 (lote 8) · **Responsável:** Dev A, Dev C
- **Requisitos:** RF05, RF06, RF07 · **ADRs:** [0048](../adr/0048-secoes-e-sorteio.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | Seção "Básico" (fixa, 40%) + seção "Sorteio" (2 de 10, 60%, mínimo 5) | Publica com soma 100%; cada aluno recebe 3 questões |
| 2 | Aluno | Faz a prova | Vê o nome da seção junto do número da questão; só as sorteadas |
| 3 | Aluno | Nota geral 8, mas 4 na seção com mínimo 5 | Reprovado; o resultado mostra a nota por seção |
| 4 | Professor | Monta um pool | Filtra o banco por disciplina e usa *Adicionar todas desta página* (o banco é paginado, 50 por página) |
| 5 | Professor | Sorteio de 9 num conjunto de 5 | Erro claro ao salvar |
| 6 | Professor | Duplica a prova | Seções e conjuntos copiados |

## Interface

`PUT /provas/:id/composicao` `{ secoes: [{ titulo, modo, sortear?, peso?, notaMinima?, itens: [{ versaoQuestaoId, peso? }] }] }`;
`GET /provas/:id` traz `secoes`, `secaoId` por item, `somaPesos` e `questoesPorParticipante`.
Resultado do aluno: `notasSecao`. Execução: `secaoTitulo` por questão.

## Testes

`provas/composicao.spec.ts`, `aplicacao/instancia.spec.ts` (sorteio por participante),
`correcao/calculo.spec.ts` (mínimo por seção), `test/secoes-e-correcao.e2e-spec.ts`,
Playwright `recursos-avancados.spec.ts`.

## Pendências e limitações

- [ ] Sorteio estratificado por dificuldade dentro da seção.
- [ ] Impressão em papel de prova com sorteio mostra o conjunto completo (aviso na tela).
