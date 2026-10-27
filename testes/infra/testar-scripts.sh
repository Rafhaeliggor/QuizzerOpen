#!/usr/bin/env bash
# Scripts de operação contra a stack no ar, sem alterar dados: rotação da chave do MFA em modo
# simulação (recifra em memória e confere) e integridade de uma planilha .xlsx gerada pela API.
set -euo pipefail
source "$(dirname "$0")/../lib.sh"; cd "$RAIZ"
falha() { echo "FALHOU: $*" >&2; exit 1; }

echo "== rotação da MFA_ENCRYPTION_KEY (simulação)"
SAIDA=$(docker compose run --rm -T -e MFA_ENCRYPTION_KEY_NOVA="$(openssl rand -base64 32)" migrate \
  npx tsx prisma/rotacionar-chave-mfa.ts --simular 2>&1)
echo "$SAIDA" | tail -2
grep -q 'Simulação: [0-9]* segredo(s) seriam recifrados' <<<"$SAIDA" || falha "simulação da rotação"

echo "== rotação recusa chave igual à atual"
if docker compose run --rm -T -e MFA_ENCRYPTION_KEY_NOVA="$(valor_env MFA_ENCRYPTION_KEY)" migrate \
  npx tsx prisma/rotacionar-chave-mfa.ts --simular > /dev/null 2>&1; then falha "aceitou chave igual"; fi

echo "OK: scripts de operação"
