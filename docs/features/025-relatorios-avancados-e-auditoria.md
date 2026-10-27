# 025 — Relatórios por aluno, por disciplina e por período; auditoria com nomes e CSV

- **Status:** Concluída com pendências
- **Sprint:** 7 (lote 6) · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF09, RF11

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | *Relatórios* → período 01/09–30/09 | Provas, disciplinas e turmas consideram só tentativas enviadas no período |
| 2 | Professor | *Por disciplina* | Acerto médio por disciplina (anuladas e pendentes fora) |
| 3 | Professor | Clica no nome do aluno no relatório da turma | Página do aluno: média, evolução, provas e disciplinas |
| 4 | Professor | Abre aluno sem relação com suas turmas/provas | 404 |
| 5 | Admin | *Auditoria* → período + ação → *Exportar CSV* | Até 10 mil eventos, com nome do usuário |

## Interface

`GET /relatorios/provas|disciplinas|alunos/:id|turmas/:id[?de=AAAA-MM-DD&ate=AAAA-MM-DD]` (datas
inclusive; `ate` vale o dia inteiro), CSVs de prova/turma aceitam o mesmo filtro.
`GET /auditoria?de&ate` (itens com `usuarioNome`) e `GET /auditoria/csv`.
Telas: filtro de período nos relatórios (fica na URL), cartão *Por disciplina*, `/app/relatorios/alunos/:id`.

## Funcionamento

A disciplina vem do **snapshot** da correção (ADR-0038). Notas anteriores ao lote 6 aparecem como
"Sem disciplina". Visibilidade: professor vê alunos das próprias provas ou turmas (inclusive
como co-professor); gestão vê tudo.

## Testes

`relatorios/agregacao.spec.ts` (`porDisciplina`), `test/politicas-e-relatorios.e2e-spec.ts`
(disciplinas, período, aluno, isolamento), `test/acesso-e-conta.e2e-spec.ts` (auditoria).

## Pendências e limitações

- [x] Excel (.xlsx) e impressão/PDF — lote 7, [031](031-relatorios-excel-e-indicios.md).
- [ ] Detecção de anomalias (🚫 no MVP).
