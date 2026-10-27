# 002 — Verificação em duas etapas (TOTP)

- **Status:** Concluída com pendências
- **Sprint:** 1 · **Responsável:** Dev A (API), Dev C (tela)
- **Requisitos:** RF01 (alternativa do passo 3), RNF05
- **ADRs:** [0007](../adr/0007-mfa-totp.md)

## Objetivo

Exigir segundo fator (app autenticador) para **Administrador** e **Coordenador**, com
cadastro guiado no primeiro acesso.

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| UC1 | Admin/Coord. sem MFA | Primeiro login com senha correta | Tela de cadastro com QR code + chave manual; após o 1º código válido, MFA ativado e login concluído |
| UC2 | Admin/Coord. com MFA | Login | Tela pede o código de 6 dígitos |
| UC3 | Qualquer com MFA | Código errado | `401 MFA_CODIGO_INVALIDO`; conta para o bloqueio de conta |
| UC4 | Atacante | Reutiliza um código já aceito | Rejeitado (anti-replay) |
| UC5 | Qualquer | Demora > 5 min entre senha e código | `401 MFA_TOKEN_INVALIDO` → refazer login |
| UC6 | Atacante | Usa o `mfaToken` como access token | `401` (audiência diferente) |
| UC7 | Admin com MFA | Tenta chamar `/mfa/cadastro` de novo | `400` (não regera segredo de quem já tem MFA) |
| UC8 | Usuário | Veio de um link protegido (ex.: `/app/usuarios`) | Após o MFA volta para o link original |

## Funcionamento

- Senha válida → `mfaToken` (JWT 5 min, `aud=quizzer-mfa`, `fin = cadastro | verificacao`).
- **Cadastro**: `POST /mfa/cadastro` gera segredo Base32, grava **cifrado** (AES-256-GCM) e
  devolve `otpauthUri`, `qrCodeDataUrl` (PNG) e `segredo` (para digitação manual). Chamar de
  novo antes de confirmar regera o segredo.
- **Verificação**: `POST /mfa/verificar` decifra o segredo, valida o código (±30 s), grava o
  time-step aceito (`mfa_ultimo_passo`) e, se `fin=cadastro`, ativa `mfa_habilitado`. Em
  seguida conclui o login como na feature 001 (sessão + cookie).

## Interface

| Método | Rota | Acesso | Corpo | Respostas |
|---|---|---|---|---|
| POST | `/api/v1/auth/mfa/cadastro` | `mfaToken` (fin=cadastro) | `{ mfaToken }` | `200 {otpauthUri, qrCodeDataUrl, segredo}` · `400` · `401` |
| POST | `/api/v1/auth/mfa/verificar` | `mfaToken` | `{ mfaToken, codigo }` | `200 {status:'AUTENTICADO', accessToken, usuario}` · `401` · `423` |

Tela: `/mfa` (o `mfaToken` fica só em memória; recarregar a página exige novo login).

## Configuração

| Variável | Padrão | Descrição |
|---|---|---|
| `MFA_ENCRYPTION_KEY` | — (obrigatória) | 32 bytes em base64 (`openssl rand -base64 32`) |
| `MFA_ISSUER` | Quizzer | Nome exibido no app autenticador |
| `JWT_MFA_TTL_SEG` | 300 | Validade do token intermediário |

## Testes

- `apps/api/test/auth.e2e-spec.ts` — UC1–UC7 de ponta a ponta (inclui espera do próximo time-step).
- `apps/api/src/modules/iam/mfa.service.spec.ts` — código válido, replay, segredo errado, QR, cifra.
- `apps/api/src/common/crypto/cifra.spec.ts` — AES-GCM (chave errada, adulteração, formato).
- `apps/web/src/paginas/auth/VerificacaoMfa.test.tsx` — UC8 (regressão: antes voltava ao login), QR, sem pendência.

## Pendências e limitações

- [x] ~~"Resetar MFA" pelo administrador~~ — Sprint 5 (`/app/usuarios/:id`, com justificativa auditada).
- [x] Códigos de recuperação — lote 7, [029](029-email-e-recuperacao-de-conta.md).
- [x] Ativação opcional de MFA por Professor/Corretor/Aluno — lote 6, [023](023-mfa-opcional-e-sessoes.md).
- [x] MFA escalonável por criticidade: prova pode exigir MFA do aluno — lote 6, [023](023-mfa-opcional-e-sessoes.md).
- [ ] Segundo fator por e-mail/SMS (RF01) — fora do MVP (sem provedor externo).
- [x] Script de rotação da `MFA_ENCRYPTION_KEY` (`prisma/rotacionar-chave-mfa.ts`) — lote 7.
- [x] ~~Auditoria do cadastro de MFA~~ — evento `MFA_ATIVADO` (Sprint 4). Reset ainda não existe.

## Arquivos principais

- API: `apps/api/src/modules/iam/mfa.service.ts`, `auth.service.ts` (`iniciarCadastroMfa`, `verificarMfa`), `src/common/crypto/cifra.ts`
- Web: `apps/web/src/paginas/auth/VerificacaoMfa.tsx`
