# 030 — Aplicação para alunos escolhidos, transferência de turma, delegação com validade e limite por sessão

- **Status:** Concluída (MVP)
- **Sprint:** 8 (lote 7) · **Responsável:** Dev A, Dev C
- **Requisitos:** RF02, RF03, RF06 · **ADRs:** [0033](../adr/0033-delegacao-de-permissoes.md), [0011](../adr/0011-rate-limit-por-ip-e-identificador.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | Aplica a prova a 2 alunos (segunda chamada) | Só eles veem ("Aplicação individual"), recebem aviso e iniciam; os demais recebem 404 |
| 2 | Professor | Tenta escolher aluno que não está nas turmas dele | 400 |
| 3 | Professor | Transfere aluno da turma A para B | Vínculo A encerrado, B criado, histórico mantido |
| 4 | Coordenação | Delegação "até 31/10" | Vence sozinha; a lista mostra "expirada" |
| 5 | Cliente com defeito | Mais de 300 gravações/min na mesma sessão | 429 só para essa sessão; colegas no mesmo IP seguem |

## Interface

`POST /aplicacoes` com `destinoTipo: 'ALUNO_AVULSO'` e `alunoIds` (até 500);
`POST /turmas/:id/alunos/:alunoId/transferir` `{turmaDestinoId}`; `PUT /permissoes/usuarios/:id/:permissao`
aceita `expiraEm`. Limitador `execucao` (300/min por token) nas rotas de execução (aluno e pública).

## Testes

`test/formatos-e-aplicacao.e2e-spec.ts`, `test/conta-e-recuperacao.e2e-spec.ts` (validade).

## Pendências e limitações

- [ ] Subgrupos nomeados de turma (destino `SUBGRUPO` ainda reservado).
