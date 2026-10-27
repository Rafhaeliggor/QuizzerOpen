# 009 — Turmas, matrículas e importação CSV

- **Status:** Concluída com pendências
- **Sprint:** 2 · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF03 · **ADRs:** [0021](../adr/0021-escopo-de-acesso-por-papel.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Professor | Cria turma (nome, período) | Professor é o responsável |
| UC2 | Coordenação | Cria/edita turma escolhendo o professor responsável | — |
| UC3 | Professor | Matricula aluno por nome/e-mail/matrícula | Se o e-mail já é de um aluno, só vincula; senão cria conta com **senha temporária** (exibida uma vez) |
| UC4 | Professor | Importa CSV (`nome,email,matricula`; `,` ou `;`) | Linhas válidas processadas; relatório com erros **por linha**, já matriculados e contas criadas; download das credenciais novas |
| UC5 | Professor | Remove aluno | Só encerra o vínculo (`data_desvinculo`); tentativas e notas ficam no histórico |
| UC6 | Professor | Usa e-mail de professor como aluno | `400` |

Regras do CSV: cabeçalho obrigatório com `nome` e `email` (acentos/caixa ignorados; aceita
`e-mail`), máximo 1000 linhas / ~1 MB, e-mail repetido no arquivo é erro, matrícula em
conflito com outro aluno é erro.

## Interface

| Método | Rota | Descrição |
|---|---|---|
| GET/POST | `/api/v1/turmas` | Lista (com total de alunos) / cria `{ nome, periodoInicio, periodoFim, professorResponsavelId? }` |
| GET/PUT | `/api/v1/turmas/:id` | Detalhe com alunos ativos / edita |
| POST | `/api/v1/turmas/:id/alunos` | `{ nome, email, matricula? }` → `{ aluno, senhaTemporaria \| null }` |
| DELETE | `/api/v1/turmas/:id/alunos/:alunoId` | Desvincula |
| POST | `/api/v1/turmas/:id/importacao` | `{ conteudo }` → relatório |

Telas: `/app/turmas`, `/app/turmas/:id` (abas Alunos / Adicionar aluno / Importar CSV com pré-visualização).
Administrador e Coordenador escolhem o **professor responsável** ao criar a turma e em *Dados da turma* (UC2;
campo incluído em 2026-10-24, [AJ-105](../ajustes-de-percurso.md#aj-105-a-aj-107)). Arquivos acima de 1 MB são recusados no navegador
antes do envio.

## Testes

- `fluxo-completo.e2e-spec.ts` (bloco RF03): matrícula individual, duplicidade, CSV com 4 tipos de erro, desvínculo preservando histórico, CSV com 900 linhas (> 100 KB).
- `apps/api/src/common/csv/csv.spec.ts`.

## Pendências e limitações

- [x] Mais de um professor por turma (co-professores) — lote 6, [022](022-delegacao-e-co-professores.md).
- [x] Convite por e-mail às contas novas (com SMTP) — lote 7.
- [x] Transferência entre turmas — lote 7, [030](030-aplicacao-avancada-e-turmas.md). (Rematricular cria novo vínculo; o histórico já fica.)
- [x] Sincronização de turmas pela API de integração — lote 8, [035](035-api-de-integracao.md).
- [x] Escolha do professor responsável na tela (UC2) — 2026-10-24, AJ-105.

## Arquivos principais

- API: `apps/api/src/modules/turmas/*`, `apps/api/src/common/csv/csv.ts`, `UsuariosService.localizarOuCriarAluno`
- Web: `apps/web/src/paginas/profissional/turmas/*`
