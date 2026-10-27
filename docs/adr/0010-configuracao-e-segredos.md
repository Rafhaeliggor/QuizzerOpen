# ADR-0010: Configuração validada no boot e gestão de segredos

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF05; plano, Seção 3 item 4 (segredos hardcoded)

## Decisão

- Toda configuração vem de **variáveis de ambiente**, validadas com **zod** no boot
  (`apps/api/src/config/env.ts`). A API **não sobe** com valor ausente ou inválido.
- **Segredos não têm valor padrão no código**: `JWT_ACCESS_SECRET` (≥ 32 caracteres),
  `MFA_ENCRYPTION_KEY` (exatamente 32 bytes em base64), senhas de Postgres/Redis.
- `.env` nunca é versionado (`.gitignore`); `.env.example` documenta cada variável e como
  gerar o valor (`openssl rand ...`). No Compose, variáveis obrigatórias usam `${VAR:?erro}`.
- Os testes e2e usam segredos fixos **exclusivos de teste** declarados em `vitest.config.e2e.ts`.
- Seed de dados (`prisma/seed.ts`): senha via `SEED_SENHA_PADRAO`; bloqueado com
  `NODE_ENV=production` salvo `SEED_PERMITIR_PRODUCAO=true` explícito.
- Logs não registram cabeçalhos (Authorization/Cookie) — ver ADR-0014.

## Consequências

- Rotacionar `JWT_ACCESS_SECRET` invalida todos os access tokens (refresh continua válido).
- Rotacionar `MFA_ENCRYPTION_KEY` exige recifrar os segredos TOTP (o prefixo `v1.` permite
  migração futura). PENDENTE: script de rotação.
- PENDENTE (Sprint 4, hardening): avaliar Docker secrets/arquivo com permissão 600 em vez de
  variáveis de ambiente no VPS.
