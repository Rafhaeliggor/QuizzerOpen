# 020 — Implantação em produção

- **Status:** Concluída com pendências (execução no VPS real pendente)
- **Sprint:** 6 (uso real) · **Responsável:** Dev B
- **ADRs:** [0031](../adr/0031-implantacao-em-producao.md), [0027](../adr/0027-revogacao-imediata-de-sessao.md)

## O que foi entregue

- **Primeiro administrador sem seed:** `docker compose run --rm migrate npx tsx prisma/criar-admin.ts --nome "…" --email …`
  (senha temporária exibida uma vez; troca e MFA obrigatórios no 1º login).
- **Verificador de prontidão** `infra/vps/verificar-producao.sh` (somente leitura; ✅/⚠️/❌; sai com erro se houver ❌).
- **Revogação de acesso em até 30 s** (desativação, logout, LGPD) — ADR-0027.
- **Roteiro passo a passo:** [docs/operacao/implantacao.md](../operacao/implantacao.md).

## Estado do ambiente de homologação (11/10/2026)

`verificar-producao.sh`: **14 ok · 6 atenção · 6 bloqueios** — todos esperados num ambiente de
demonstração: HTTP sem TLS, 7 contas de demonstração, backup sem cópia externa, firewall
inativo e SSH com senha nesta máquina, política de privacidade com campos em aberto.

## Pendências

- [ ] Executar o roteiro no VPS de produção até o verificador ficar sem ❌.
- [x] ~~Publicar o repositório e ligar o CI; definir o fluxo de deploy~~ — repositório no GitHub (remoto `origin`); deploy manual com CI verde (`deploy.yml`, lote 7 — ADR-0046). Conferir o resultado do CI na aba *Actions*.
