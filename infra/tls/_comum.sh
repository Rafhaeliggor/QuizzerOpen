#!/usr/bin/env bash
# Funções compartilhadas pelos scripts de TLS. Executar sempre a partir de qualquer pasta.
set -euo pipefail
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$RAIZ"
[[ -f .env ]] || { echo "Arquivo .env não encontrado em $RAIZ" >&2; exit 1; }

# Define (ou acrescenta) VAR=valor no .env sem duplicar a linha.
definir() {
  if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=$2|" .env; else printf '%s=%s\n' "$1" "$2" >> .env; fi
}

# Volume do Compose (nome do projeto = "quizzer").
VOLUME_CERTS="quizzer_tls_certs"
