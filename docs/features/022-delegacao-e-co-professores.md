# 022 — Delegação de permissões e co-professores de turma

- **Status:** Concluída com pendências
- **Sprint:** 7 (lote 6) · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF02, RF03 · **ADRs:** [0033](../adr/0033-delegacao-de-permissoes.md), [0039](../adr/0039-co-professores-de-turma.md)

## Objetivo

RF02: delegar uma permissão específica a alguém sem mudar o papel. RF03: turma com mais de um
professor responsável.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Coordenação | Concede `REABRIR_TENTATIVAS` a um professor com justificativa | Professor vê o botão *Reabrir* nas próprias aplicações (em até 30 s: o app relê `/auth/me` a cada 30 s e ao voltar à aba — [BUG-032](../bugs-corrigidos.md#bug-032)) |
| 2 | Coordenação | Concede `DESBLOQUEAR_CONTAS` a um professor de plantão | Professor vê *Usuários* (consulta) e desbloqueia contas; não desativa nem edita |
| 3 | Admin | Concede `CONSULTAR_AUDITORIA` | Professor vê *Auditoria* |
| 4 | Admin | Muda o papel da pessoa | Todas as delegações são removidas |
| 5 | Professor | Tenta delegar / delegar a aluno / a si | 403 / 400 / 403 |
| 6 | Professor titular | Adiciona co-professor à turma | Co-professor vê a turma, matricula e aplica provas |
| 7 | Co-professor | Tenta mudar a equipe ou renomear a turma | 403 |

## Funcionamento

- Catálogo e regras no ADR-0033. Concessão/revogação na página do usuário (**Permissões
  delegadas**, visível para Admin/Coord. quando o alvo é Professor ou Corretor). A interface usa
  `usuario.permissoes` (de `/auth/me`) para mostrar menus e botões; a API decide pelo
  `@Delegavel` no `AuthGuard`.
- Turma: aba **Professores** no detalhe da turma (lista para todos; edição para titular/gestão);
  a lista de turmas mostra os co-professores; a visibilidade de turma passou a incluir
  `professores.some(professorId = eu)`.

## Interface

| Método | Rota | Quem |
|---|---|---|
| GET | `/api/v1/permissoes/catalogo` | Admin, Coord. |
| GET | `/api/v1/permissoes/usuarios/:id` | Admin, Coord. |
| PUT | `/api/v1/permissoes/usuarios/:id/:permissao` | Admin, Coord. — `{justificativa}` |
| POST | `/api/v1/permissoes/usuarios/:id/:permissao/revogar` | Admin, Coord. — `{justificativa}` |
| GET | `/api/v1/minha-conta/permissoes` | qualquer autenticado |
| PUT | `/api/v1/turmas/:id/professores` | titular, gestão — `{professorIds: []}` |
| GET | `/api/v1/usuarios/professores` | autoria (nome/e-mail de professores ativos) |

Rotas com `@Delegavel`: `POST /aplicacoes/tentativas/:id/reabrir`, `GET /usuarios`, `GET /usuarios/:id`,
`POST /usuarios/:id/desbloquear`, `GET /auditoria` (e `/auditoria/csv`).

## Testes

`test/acesso-e-conta.e2e-spec.ts` (delegação, revogação, mudança de papel, co-professores),
`common/auth/auth.guard.spec.ts` (guard com `@Delegavel`), `apps/web/src/auth/papeis.test.ts`.

## Pendências e limitações

- [x] Validade opcional da delegação — lote 7, [030](030-aplicacao-avancada-e-turmas.md).
- [ ] Catálogo maior depende das RNs (anexo ausente).
- [ ] Co-professor não corrige provas de outro professor da mesma turma (decisão do ADR-0039).

## Arquivos principais

`apps/api/src/common/auth/{permissoes,decorators,auth.guard}.ts`,
`apps/api/src/modules/iam/{permissoes.service,conta.controller}.ts`,
`apps/api/src/modules/turmas/turmas.service.ts`,
`apps/web/src/paginas/profissional/{DetalheUsuario.tsx,turmas/DetalheTurma.tsx}`, `apps/web/src/auth/papeis.ts`.
