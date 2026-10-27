# ADR-0007: MFA por TOTP obrigatório para Administrador e Coordenador

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A (backend), Dev C (frontend)
- **Requisitos relacionados:** RF01 (alternativa do passo 3), RNF05

## Contexto

O RNF05 exige MFA obrigatório para perfis administrativos; o plano reincorporou MFA (TOTP)
obrigatório para Admin/Coordenador na Sprint 1. O RF01 cita app autenticador, e-mail ou SMS.

## Decisão

- **Somente TOTP** (RFC 6238, 6 dígitos, passo de 30 s) via `otplib` 13 — compatível com
  Google/Microsoft Authenticator, Authy etc. E-mail e SMS ficam fora do MVP (não há provedor
  externo — plano, Seção 6).
- **Obrigatório** para `ADMINISTRADOR` e `COORDENADOR`. Para os demais papéis o MFA é exigido
  se `mfa_habilitado=true` (ativação opcional ainda sem tela — pendência).
- **Fluxo em duas etapas com token intermediário**: senha válida → `{ status, mfaToken }`
  (JWT de 5 min, `aud=quizzer-mfa`, não serve como access token).
  - `MFA_CADASTRO_REQUERIDO` (primeiro acesso): `POST /auth/mfa/cadastro` gera o segredo e
    devolve QR code (data URI PNG) + chave manual; `POST /auth/mfa/verificar` confirma com o
    primeiro código e ativa o MFA.
  - `MFA_REQUERIDO`: `POST /auth/mfa/verificar` com o código.
- **Segredo cifrado em repouso** com AES-256-GCM (`MFA_ENCRYPTION_KEY`, 32 bytes), formato
  versionado `v1.<iv>.<tag>.<dados>` para permitir rotação de chave.
- **Anti-replay**: o time-step aceito é salvo em `mfa_ultimo_passo`; o mesmo código não é
  aceito duas vezes. Tolerância de ±30 s para relógios dessincronizados.
- Códigos inválidos contam para o bloqueio de conta (ADR-0006).

## Alternativas consideradas

- **WebAuthn/passkeys** — mais seguro, porém mais complexo de implementar e testar no prazo.
- **E-mail/SMS OTP** — exige provedor externo; adiado.

## Consequências

- Quem tem a senha de um Admin/Coordenador que ainda não cadastrou o MFA consegue cadastrar o
  próprio dispositivo (risco inerente ao primeiro cadastro). Mitigação: contas administrativas
  são criadas pelo Admin e o cadastro ocorre no primeiro login.
- PENDENTE: códigos de recuperação e fluxo administrativo de "resetar MFA" de um usuário
  (hoje só via banco). Avaliar na Sprint 4 junto com auditoria.
- PENDENTE: MFA escalonável por criticidade da prova para alunos (RNF05) — fora do MVP.
