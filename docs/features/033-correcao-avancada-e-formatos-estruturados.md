# 033 — Corretores designados, correção às cegas, rubrica pontuada, recurso encaminhado; associação e ordenação

- **Status:** Concluída (MVP)
- **Sprint:** 9 (lote 8) · **Responsável:** Dev A, Dev C
- **Requisitos:** RF04, RF07, RF08 · **ADRs:** [0049](../adr/0049-correcao-designada-as-cegas-e-rubrica.md), [0047](../adr/0047-formulas-e-novos-formatos.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | Designa a corretora Diana na prova | Só Diana (além dele e da coordenação) vê as correções dessa prova |
| 2 | Corretor | Prova com correção às cegas | Fila e tela mostram "Participante 3F9A1C"; após publicar, o nome volta |
| 3 | Professor | Dissertativa com critérios (2 + 3 pts) | Corretor marca pontos por critério; nota = soma ÷ 5 |
| 4 | Professor | Encaminha recurso à coordenação | Coordenação é avisada; o professor não decide mais |
| 5 | Professor | Questão de associação (4 pares + 1 extra) | Aluno escolhe a opção de cada item; 2 certos = 50% |
| 6 | Professor | Questão de ordenação (3 itens) | Aluno reordena; nota pelos pares na ordem certa |

## Interface

`PUT /provas/:id/corretores` `{usuarioIds}`, `GET /usuarios/corretores`; parâmetro `correcaoAsCegas`;
`rubricaItens` na questão; `POST /correcao/notas/:id/questoes/:vq` aceita `pontosItens`;
`POST /recursos/:id/encaminhar` `{motivo}`; formatos `ASSOCIACAO` (`associacoes`, `opcoesExtras`) e
`ORDENACAO` (`itensOrdem`); respostas `{pares}` e `{ordem}`.

## Testes

`calculo.spec.ts` (associação, Kendall, rubrica, às cegas), `instancia.spec.ts` (apresentação),
`QuestaoEstruturada.test.tsx`, `test/secoes-e-correcao.e2e-spec.ts`, Playwright (associação).

## Pendências e limitações

- [ ] Dupla correção com arbitragem.
- [ ] Ordenação por arrastar (hoje botões ↑/↓, acessíveis por teclado).
