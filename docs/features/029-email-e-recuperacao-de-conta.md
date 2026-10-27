# 029 — E-mail opcional, "esqueci minha senha", convites, códigos de recuperação e política

- **Status:** Concluída (MVP)
- **Sprint:** 8 (lote 7) · **Responsável:** Dev A, Dev B, Dev C
- **Requisitos:** RF01, RF02, RF10, RNF05 · **ADRs:** [0041](../adr/0041-email-opcional-e-recuperacao-de-senha.md), [0042](../adr/0042-codigos-de-recuperacao-e-rotacao-da-chave-mfa.md), [0043](../adr/0043-ciencia-da-politica-de-privacidade.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Qualquer | *Esqueci minha senha* (aparece só com SMTP) | E-mail com link de 30 min; mesma resposta para e-mail inexistente |
| 2 | Novo usuário | Conta criada pela administração/turma | Recebe "Seu acesso ao Quizzer" com link para definir a senha (72 h) |
| 3 | Aluno/prof. | Ativa MFA | Recebe 10 códigos de recuperação (baixar .txt) |
| 4 | Quem perdeu o celular | No login, *usar um código de recuperação* | Entra; código consumido; aviso no sino e por e-mail |
| 5 | Qualquer | Primeiro acesso após nova versão da política | Aviso "Li e estou ciente" (não bloqueia, nunca na prova) |
| 6 | Qualquer | Desliga "Avisos por e-mail" | Sino continua; e-mails param |
| 7 | TI | Rotação da chave do MFA | `rotacionar-chave-mfa.ts --simular` e depois de verdade |

## Interface

`GET /auth/recursos`, `POST /auth/senha/esqueci`, `POST /auth/senha/redefinir`,
`POST /minha-conta/mfa/codigos-recuperacao`, `POST /minha-conta/politica/aceitar`,
`PATCH /minha-conta/preferencias`; telas `/esqueci-senha`, `/aluno/esqueci-senha`,
`/redefinir-senha`, `/aluno/redefinir-senha`; `/auth/mfa/verificar` aceita `XXXX-XXXX`.

## Configuração

`SMTP_HOST`, `SMTP_PORTA` (587), `SMTP_SEGURO`, `SMTP_USUARIO`, `SMTP_SENHA`, `EMAIL_REMETENTE`,
`APP_URL`, `POLITICA_VERSAO`. Rotação: `MFA_ENCRYPTION_KEY_NOVA`.

## Testes

`test/conta-e-recuperacao.e2e-spec.ts` (5 cenários), `mfa.service.spec.ts` (códigos),
`RecuperarSenha.test.tsx`, `testes/infra/testar-scripts.sh` (rotação simulada).

## Pendências e limitações

- [x] Fila com retentativa para notificações — lote 8, [034](034-notificacoes-tempo-real-e-fila.md). - [ ] E-mail em HTML.
- [ ] Notificação por push (🚫).
