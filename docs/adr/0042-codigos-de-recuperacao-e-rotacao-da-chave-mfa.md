# ADR-0042: Códigos de recuperação do MFA e rotação da chave de cifra

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A
- **Requisitos relacionados:** RF01, RNF05

## Decisão

- Ao ativar o MFA (ou a pedido, com o código do app), o usuário recebe **10 códigos de recuperação**
  `XXXX-XXXX` (alfabeto sem ambíguos, ~39 bits cada), mostrados **uma vez** (com opção de baixar).
  No banco ficam só os hashes SHA-256 com prefixo de domínio. Cada código vale **uma vez**, só no
  login (não substitui o cadastro do app), conta como falha quando errado (bloqueio por tentativas),
  é auditado (`MFA_CODIGO_RECUPERACAO_USADO`) e gera aviso ao titular com o número restante.
  Reset de MFA pela administração e desativação apagam os códigos.
- **Rotação da `MFA_ENCRYPTION_KEY`:** `prisma/rotacionar-chave-mfa.ts` decifra todos os segredos
  com a chave atual, recifra com `MFA_ENCRYPTION_KEY_NOVA`, confere e grava **numa transação**
  (`--simular` não grava). Nada muda se qualquer segredo falhar. Ninguém precisa recadastrar o app.

## Alternativas consideradas

- **Hash lento (Argon2) para os códigos** — 39 bits com bloqueio de conta após poucas falhas já
  tornam a força bruta inviável; SHA-256 mantém a verificação barata no login.
