# ADR-0046: Uptime externo e deploy manual pelo GitHub Actions

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF03; plano Dev B (CD)

## Decisão

- **Uptime** (`.github/workflows/uptime.yml`): a cada 15 min, de fora do VPS, verifica `/healthz`,
  `/api/v1/health` (3 tentativas) e a validade do certificado (> 14 dias). Liga sozinho quando a
  variável do repositório `URL_PRODUCAO` existe. Complementa o monitor interno (ADR-0036).
- **Deploy** (`.github/workflows/deploy.yml`): **só manual**, só da `main`, exige digitar `DEPLOY`,
  confere que todos os checks do commit estão verdes, usa o *environment* `producao` (pode exigir
  aprovação), chave SSH dedicada e **fingerprint fixo do servidor** (`StrictHostKeyChecking=yes`),
  faz checkout do SHA exato, `docker compose up -d --build --wait` e roda o verificador de produção.

## Alternativas consideradas

- **Deploy automático a cada push** — a regra do plano exige revisão humana; manual com conferência
  do CI é o meio-termo.
