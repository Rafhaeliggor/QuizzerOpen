# 001 — Autenticação e sessão

- **Status:** Concluída com pendências
- **Sprint:** 1 · **Responsável:** Dev A (API), Dev C (telas)
- **Requisitos:** RF01 (Autenticar-se no Sistema), RF02 passo 4 (troca de senha no 1º acesso), RNF05
- **ADRs:** [0006](../adr/0006-autenticacao-jwt-sessao.md), [0011](../adr/0011-rate-limit-por-ip-e-identificador.md), [0010](../adr/0010-configuracao-e-segredos.md)

## Objetivo

Autenticar profissionais e alunos em portais separados, emitir sessão com contexto de
**ambiente** e **papel**, bloquear força bruta e manter a sessão entre recarregamentos.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Professor/Corretor | Login com e-mail e senha corretos em `/login` | Entra em `/app` (painel profissional) |
| UC2 | Aluno | Login com **matrícula** ou e-mail em `/aluno/login` | Entra em `/aluno` |
| UC3 | Qualquer | Senha errada | `401 Credenciais inválidas` (mensagem genérica) |
| UC4 | Qualquer | E-mail inexistente | Mesma resposta do UC3, com tempo equivalente |
| UC5 | Aluno | Credenciais corretas no portal profissional (ou vice-versa) | `401`, sem contar como tentativa de força bruta |
| UC6 | Qualquer | 5 falhas seguidas (padrão) | Conta bloqueada 15 min; `423 CONTA_BLOQUEADA`, mesmo com a senha correta |
| UC7 | Admin/Coordenador | Login | Segue para o MFA ([feature 002](002-mfa-totp.md)) |
| UC8 | Usuário criado pelo admin | 1º login com senha temporária | Redirecionado para `/trocar-senha`; demais rotas da API respondem `403 TROCA_SENHA_OBRIGATORIA` |
| UC9 | Qualquer | Recarrega a página / volta no dia seguinte (≤ 7 dias) | Sessão restaurada pelo cookie de refresh |
| UC10 | Qualquer | Sair | Sessão revogada no servidor; refresh deixa de funcionar |
| UC11 | Atacante | Reusa um refresh token antigo (roubado) | Sessão inteira revogada (inclusive o refresh legítimo atual) |
| UC12 | Turma no laboratório | 30+ alunos logando ao mesmo tempo pelo mesmo IP | Todos conseguem (rate limit é por IP + identificador) |

## Funcionamento

1. Usuário informa identificador e senha no portal do seu ambiente.
2. API busca o usuário (profissional: e-mail; aluno: e-mail ou matrícula). E-mail sempre minúsculo.
3. Se bloqueado → `423`. Verifica senha (Argon2id). Falha → incrementa contador; ao atingir o
   limite, grava `bloqueado_ate` e zera o contador.
4. Confere `ativo` e se o papel pertence ao ambiente do portal.
5. Se o papel exige MFA (ou o usuário tem MFA ativo) → devolve `mfaToken` (feature 002).
6. Senão: zera contador, grava `ultimo_login_em`, cria **sessão** (`iam.sessoes`) e devolve
   `accessToken` (JWT 15 min) + cookie httpOnly `qz_refresh`.
7. Frontend guarda o access token **em memória**. Em `401`, chama `/auth/refresh` uma única
   vez (requisições simultâneas compartilham) e repete a chamada; se falhar, encerra a sessão local.

## Interface

| Método | Rota | Acesso | Corpo | Respostas |
|---|---|---|---|---|
| POST | `/api/v1/auth/profissional/login` | público | `{ email, senha }` | `200 {status:'AUTENTICADO', accessToken, usuario}` · `200 {status:'MFA_REQUERIDO'\|'MFA_CADASTRO_REQUERIDO', mfaToken}` · `400` · `401` · `423` · `429` |
| POST | `/api/v1/auth/aluno/login` | público | `{ login, senha }` | idem |
| POST | `/api/v1/auth/refresh` | cookie `qz_refresh` | — | `200 {accessToken}` (+ novo cookie) · `401 SESSAO_INVALIDA` |
| POST | `/api/v1/auth/logout` | autenticado | — | `204` |
| GET | `/api/v1/auth/me` | autenticado (inclusive com senha pendente) | — | `200 {id, nome, email, matricula, papel, ambiente, mfaHabilitado, trocarSenha}` |
| POST | `/api/v1/auth/senha` | autenticado (inclusive com senha pendente) | `{ senhaAtual, novaSenha }` | `200 {accessToken, usuario}` · `400` |

Telas: `/login`, `/aluno/login`, `/trocar-senha`.

Política de senha: 10–128 caracteres, com letras e números (validada na API e na tela).

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `JWT_ACCESS_SECRET` | — (obrigatória, ≥ 32) | Segredo HMAC dos JWTs |
| `JWT_ACCESS_TTL_SEG` | 900 | Validade do access token |
| `REFRESH_TTL_DIAS` | 7 | Validade da sessão/refresh |
| `LOGIN_MAX_TENTATIVAS` | 5 | Falhas até bloquear |
| `LOGIN_BLOQUEIO_MIN` | 15 | Duração do bloqueio |
| `RATE_LIMIT_CREDENCIAIS` | 10 | Req/min por IP + identificador nas rotas de credencial |
| `RATE_LIMIT_POR_IP` | 600 | Req/min por IP (geral) |
| `TLS_ATIVO` | true | `false` enquanto o acesso for HTTP por IP (cookie sem `Secure`) |

## Testes

- `apps/api/test/auth.e2e-spec.ts` — UC1–UC6, UC8, UC10–UC12, cookie (HttpOnly/SameSite/Path), rotação e reuso de refresh.
- `apps/api/src/common/throttle/throttlers.spec.ts` — chave do rate limit.
- `apps/web/src/paginas/auth/FormularioLogin.test.tsx` — redirecionamentos, erro da API, 429.
- `apps/web/src/api/cliente.test.ts` — renovação única em 401 concorrente; sessão expirada.
- Validado manualmente no navegador (Chromium/Playwright) contra a stack Docker: login, reload, logout, troca de senha.
- `apps/web/src/auth/ProvedorAuth.test.tsx` — logout com access token vencido renova e revoga a sessão ([BUG-030](../bugs-corrigidos.md#bug-030)).

## Pendências e limitações

- [x] ~~Notificar o titular quando a conta for bloqueada~~ — feito na Sprint 4 (notificação in-app, [015](015-notificacoes-e-auditoria.md)).
- [x] ~~Registrar login, falha, bloqueio, MFA e troca de senha na auditoria~~ — feito na Sprint 4.
- [x] ~~"Esqueci minha senha"~~ — com SMTP configurado, lote 7 ([029](029-email-e-recuperacao-de-conta.md)); sem e-mail, o admin redefine.
- [x] ~~Desbloqueio manual de conta~~ — Sprint 5 (Admin/Coordenação).
- [x] Argon2id com parâmetros OWASP e re-hash transparente — [ADR-0023](../adr/0023-parametros-argon2-owasp.md).
- [x] ~~Listar/revogar sessões ativas do próprio usuário~~ — *Minha conta*, lote 6 ([023](023-mfa-opcional-e-sessoes.md)).
- [x] ~~Limpeza periódica de sessões expiradas/revogadas~~ — a cada 6 h na API, lote 6 ([023](023-mfa-opcional-e-sessoes.md)).
- [x] ~~Access token válido até 15 min após logout~~ — revogação em até 30 s ([ADR-0027](../adr/0027-revogacao-imediata-de-sessao.md)).
- [ ] Ao abrir o app sem sessão, o navegador registra um `401` de `/auth/refresh` no console (esperado; cosmético).
- [ ] Rate limit em memória — mover para Redis se houver mais de uma réplica da API.

## Arquivos principais

- API: `apps/api/src/modules/iam/{auth.controller,auth.service,sessao.service,senha.service,dto}.ts`
- Web: `apps/web/src/auth/*`, `apps/web/src/api/cliente.ts`, `apps/web/src/paginas/auth/*`
