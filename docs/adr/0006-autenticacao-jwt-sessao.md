# ADR-0006: Autenticação — login por ambiente, JWT curto + refresh rotacionado

- **Status:** Aceito — parâmetros do Argon2id atualizados pelo [ADR-0023](0023-parametros-argon2-owasp.md); revogação imediata pelo [ADR-0027](0027-revogacao-imediata-de-sessao.md)
- **Data:** 2026-10-10
- **Responsável:** Dev A (backend), Dev C (frontend)
- **Requisitos relacionados:** RF01, RF02, RNF05

## Contexto

RF01 pede login segmentado por ambiente (profissional/aluno), token com contexto de
ambiente e papel, bloqueio temporário após tentativas inválidas e gestão de sessão.
RNF05 exige isolamento estrito entre ambientes e menor privilégio.

## Decisão

**Endpoints separados por ambiente**
- `POST /api/v1/auth/profissional/login` (e-mail) e `POST /api/v1/auth/aluno/login`
  (e-mail **ou** matrícula). Senha correta no portal errado → `401 Credenciais inválidas`
  (mesma mensagem), sem contar como falha de força bruta.

**Senhas**
- Hash **Argon2id** (`argon2`, parâmetros padrão: 64 MiB, t=3, p=4).
- Política: 10–128 caracteres com letras e números.
- Usuário inexistente executa uma verificação Argon2 fictícia (equaliza tempo de resposta,
  evita enumeração de contas por timing). Mensagem de erro sempre genérica.
- Usuário criado por administrador recebe senha temporária aleatória e `trocar_senha=true`.
  Enquanto pendente, o access token carrega `trs: true` e o guard só libera rotas marcadas
  com `@PermiteSenhaPendente()` (`/auth/me`, `/auth/senha`, `/auth/logout`).

**Bloqueio por tentativas**
- `LOGIN_MAX_TENTATIVAS` (padrão 5) falhas → conta bloqueada por `LOGIN_BLOQUEIO_MIN`
  (padrão 15) minutos; resposta `423` com `codigo: CONTA_BLOQUEADA`.
- Códigos MFA inválidos contam para o mesmo limite.
- Login bem-sucedido zera o contador.
- ~~Trade-off aceito: a resposta 423 revela que a conta existe (somente quando bloqueada).~~
  **Revisto em 2026-10-27 (BUG-048):** no login, a conta bloqueada recebe a **mesma resposta
  401 genérica** de credencial inválida, e a senha é verificada mesmo assim, no mesmo tempo. A
  mensagem genérica passou a mencionar o bloqueio depois de várias tentativas erradas. O titular é
  avisado do bloqueio por notificação (e por e-mail, se houver SMTP). O 423 ficou só na etapa do
  MFA, em que a senha já foi validada.

**Tokens e sessão**
- **Access token**: JWT HS256, 15 min (`JWT_ACCESS_TTL_SEG`), `iss=quizzer`,
  `aud=quizzer-api`, claims `sub`, `papel`, `amb` (ambiente), `sid` (sessão), `trs`.
  Enviado em `Authorization: Bearer`. No frontend fica **somente em memória**.
- **Refresh token**: opaco (`<sessaoId>.<32 bytes aleatórios>`), guardado apenas como
  SHA-256 em `iam.sessoes`, validade 7 dias (`REFRESH_TTL_DIAS`), em cookie
  `qz_refresh` **httpOnly, SameSite=Strict, Path=/api/v1/auth**, `Secure` quando `TLS_ATIVO=true`.
- **Rotação a cada uso**; reapresentar um refresh já rotacionado **revoga a sessão**
  — **revisto em 2026-10-27 (BUG-047):** o refresh anterior continua valendo por 30 s depois da
  rotação (`refresh_anterior_hash`, `rotacionada_em`). Dentro dessa janela, a requisição que perdeu
  a corrida recebe só um access token e o cookie do vencedor é mantido. Fora da janela, o reuso
  revoga a sessão como antes. A rotação é condicional ao hash lido (`updateMany`), então duas
  rotações simultâneas não sobrescrevem uma à outra.
  (detecção de roubo de token).
- Logout revoga a sessão. Troca de senha revoga as **demais** sessões do usuário.
- O access token não é revogável antes de expirar (stateless): aceitável com TTL de 15 min.

**Autorização**
- `AuthGuard` global: tudo é protegido por padrão; `@Publico()` libera.
- `@AmbienteRequerido('PROFISSIONAL'|'ALUNO')` e `@Papeis(...)` por controller/rota.
- Defesa em profundidade: token cujo `amb` não corresponde ao papel é rejeitado.
- Rotas marcadas no frontend são apenas UX; a autorização real é sempre da API.

## Alternativas consideradas

- **Sessão em servidor (cookie de sessão + Redis)** — simples, mas exige CSRF em todas as
  rotas mutáveis. Com Bearer em memória + refresh SameSite=Strict num path restrito, a
  superfície de CSRF fica limitada ao `/auth/refresh`, que só devolve um token ao próprio site.
- **Access token em localStorage** — exposto a XSS; descartado.
- **Passport.js** — camada extra sem ganho para JWT simples; guard próprio é mais legível.

## Consequências

- Recarregar a página restaura a sessão via `POST /auth/refresh` (o cookie é enviado pelo navegador).
- PENDENTE: notificar o titular quando a conta for bloqueada (RF01) — depende de notificações
  in-app (Sprint 4) — e registrar o evento na auditoria (Sprint 4).
- PENDENTE: delegação de permissões (`iam.permissoes_delegadas`) modelada, ainda sem API.
