# 004 — Gestão de usuários (cadastro e listagem)

- **Status:** Concluída com pendências
- **Sprint:** 1 · **Responsável:** Dev A (API), Dev C (tela)
- **Requisitos:** RF02 (Cadastrar Usuário Profissional e Atribuir Papel)
- **ADRs:** [0006](../adr/0006-autenticacao-jwt-sessao.md), [0013](../adr/0013-convencoes-de-nomenclatura-e-api.md)

## Objetivo

Permitir que o Administrador cadastre usuários e defina o papel, com troca de senha
obrigatória no primeiro acesso; listar usuários para Administrador e Coordenador.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Administrador | Cadastra nome, e-mail, papel (e matrícula, se aluno) | Usuário criado; **senha temporária exibida uma única vez** |
| UC2 | Administrador | Cadastra e-mail/matrícula já existente | `409` "Já existe um usuário com este e-mail ou matrícula" |
| UC3 | Novo usuário | Primeiro login com a senha temporária | Obrigado a definir nova senha ([001](001-autenticacao-e-sessao.md), UC8) |
| UC4 | Admin/Coordenador | Lista usuários, filtra por papel/busca, pagina | Lista sem dados sensíveis |
| UC5 | Professor/Corretor/Aluno | Tenta cadastrar ou listar | `403` |
| UC6 | Administrador | Edita nome, e-mail, papel e matrícula | Mudar papel/e-mail encerra as sessões; não altera o próprio papel |
| UC7 | Administrador | Desativa / reativa conta (justificativa) | Login e sessões bloqueados; histórico preservado; auditado |
| UC8 | Administrador | Redefine a senha | Nova senha temporária (exibida uma vez), troca obrigatória, desbloqueia, encerra sessões |
| UC9 | Administrador / Coordenação | Desbloqueia conta bloqueada por tentativas | Contador zerado |
| UC10 | Administrador | Reseta o MFA (perda do celular; justificativa) | Próximo login pede novo cadastro do app autenticador |

## Funcionamento

- Nome é aparado; e-mail é aparado e convertido para minúsculas.
- Senha temporária: 16 caracteres aleatórios (`crypto.randomInt`), sem caracteres ambíguos.
- `trocar_senha=true` no cadastro. Como não há e-mail no MVP, o passo 3 do RF02 ("sistema
  envia credenciais") é substituído por: **o administrador repassa a senha temporária** ao
  usuário por canal seguro (a tela avisa que ela não será exibida novamente).
- Listagem: `?papel=&busca=&pagina=&tamanho=` (busca em nome, e-mail e matrícula, sem
  distinção de maiúsculas); ordenada por nome; máximo 100 por página.

## Interface

| Método | Rota | Papéis | Corpo / Query | Respostas |
|---|---|---|---|---|
| POST | `/api/v1/usuarios` | ADMINISTRADOR | `{ nome, email, papel, matricula? }` | `201 {usuario, senhaTemporaria}` · `400` · `409` |
| GET | `/api/v1/usuarios` | ADMINISTRADOR, COORDENADOR | `papel?, busca?, pagina=1, tamanho=20` | `200 {total, pagina, tamanho, itens[]}` (com `ativo`, `bloqueado`) |
| GET | `/api/v1/usuarios/:id` | ADMINISTRADOR, COORDENADOR | — | situação, último acesso, sessões ativas |
| PATCH | `/api/v1/usuarios/:id` | ADMINISTRADOR | `{ nome?, email?, papel?, matricula? }` | `200` · `409` |
| POST | `/api/v1/usuarios/:id/desativar` · `/reativar` | ADMINISTRADOR | `{ justificativa }` | `200` |
| POST | `/api/v1/usuarios/:id/redefinir-senha` | ADMINISTRADOR | — | `200 {senhaTemporaria}` |
| POST | `/api/v1/usuarios/:id/desbloquear` | ADMINISTRADOR, COORDENADOR | — | `200` |
| POST | `/api/v1/usuarios/:id/resetar-mfa` | ADMINISTRADOR | `{ justificativa }` | `200` |

Telas: `/app/usuarios` (busca; situação Ativo / Aguardando 1º acesso / Bloqueado / Desativado; "Novo usuário" só para Admin) e `/app/usuarios/:id` (situação e ações administrativas).

## Testes

- `apps/api/test/usuarios.e2e-spec.ts` — UC1–UC5, normalização, validação (`papel` inválido e campo extra → `400`).
- Validado no navegador: cadastro de corretora, 1º acesso com troca de senha, bloqueio de `/app/usuarios` para corretor.

## Pendências e limitações

- [x] ~~Editar, alterar papel, desativar/reativar, redefinir senha, desbloquear, resetar MFA~~ — Sprint 5 (`usuarios-admin.e2e-spec.ts`).
- [x] ~~Desativação não invalidava o access token já emitido~~ — corte em até 30 s ([ADR-0027](../adr/0027-revogacao-imediata-de-sessao.md)).
- Conta anonimizada (LGPD) não pode ser editada nem reativada ([feature 019](019-lgpd.md)).
- [x] Convite por e-mail para definir a senha (com SMTP configurado) — lote 7, [029](029-email-e-recuperacao-de-conta.md).
- [x] Delegação de permissões (RF02 — alternativa) — lote 6, [022](022-delegacao-e-co-professores.md).
- [x] ~~Cadastro de alunos em lote~~ — importação CSV ([009](009-turmas-e-importacao-csv.md)).
- [x] ~~Exclusão/anonimização de dados pessoais (LGPD)~~ — [feature 019](019-lgpd.md).
- [x] ~~Auditoria de cadastro e mudança de papel~~ — `USUARIO_CRIADO`, `USUARIO_PAPEL_ALTERADO` e demais eventos de conta ([015](015-notificacoes-e-auditoria.md)).

## Arquivos principais

- API: `apps/api/src/modules/usuarios/*`
- Web: `apps/web/src/paginas/profissional/Usuarios.tsx`
