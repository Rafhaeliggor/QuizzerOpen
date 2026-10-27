#!/usr/bin/env bash
# Funções comuns dos scripts de teste.
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
valor_env() { grep -E "^$1=" "$RAIZ/.env" 2>/dev/null | tail -1 | cut -d= -f2-; }
# "127.0.0.1:8080" → "127.0.0.1:8080"; "80" → "127.0.0.1:80"
endereco() { [[ "$1" == *:* ]] && echo "$1" || echo "127.0.0.1:$1"; }
URL_HTTP="http://$(endereco "$(valor_env HTTP_PORT || true)")"
if [[ "$URL_HTTP" == "http://127.0.0.1:" ]]; then URL_HTTP="http://127.0.0.1:80"; fi
URL_HTTPS="https://$(endereco "$(valor_env HTTPS_PORT || true)")"
if [[ "$URL_HTTPS" == "https://127.0.0.1:" ]]; then URL_HTTPS="https://127.0.0.1:443"; fi
# Endereço da aplicação: com TLS ligado, o HTTP só redireciona — os testes usam o HTTPS
# (certificado autoassinado aceito: curl -k, Playwright e Node sem verificação).
TLS_MODO_ATUAL=$(valor_env TLS_MODO || true)
if [[ -n "$TLS_MODO_ATUAL" && "$TLS_MODO_ATUAL" != desligado ]]; then
  URL_APP="$URL_HTTPS"; CURL_TLS=(-k)
  export E2E_IGNORAR_CERTIFICADO=true NODE_TLS_REJECT_UNAUTHORIZED=0
else
  URL_APP="$URL_HTTP"; CURL_TLS=()
fi
# Este arquivo é carregado com `source` por scripts com `set -e`: precisa terminar com status 0.
true
