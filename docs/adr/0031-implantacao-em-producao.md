# ADR-0031: Implantação em produção sem seed e com verificação automatizada

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF05; plano Dev B Sprint 4 (hardening final)

## Decisão

- **Produção nunca usa o seed** (contas `@quizzer.local` com senha conhecida). O primeiro
  administrador é criado por `prisma/criar-admin.ts` (senha temporária aleatória exibida uma vez,
  troca obrigatória e MFA no 1º login, evento de auditoria).
- **`infra/vps/verificar-producao.sh`**: verificação somente leitura com ✅/⚠️/❌ e código de saída
  ≠ 0 se houver bloqueio: `.env` (permissão e segredos), HTTPS, saúde dos serviços, portas
  publicadas, contas de demonstração, administradores e MFA, backup (recente, cifrado, externo,
  alerta), firewall/SSH/fail2ban e política de privacidade preenchida.
- Roteiro passo a passo em [`docs/operacao/implantacao.md`](../operacao/implantacao.md); go-live
  só com o verificador sem ❌.

## Consequências

- O ambiente atual de homologação tem 6 bloqueios esperados (HTTP, contas de demonstração,
  backup sem cópia externa, firewall/SSH, política com campos em aberto) — listados no roteiro.
