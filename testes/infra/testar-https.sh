#!/usr/bin/env bash
# Testa o HTTPS na stack Docker: liga o modo autoassinado (se estiver desligado), confere
# redirecionamento, HSTS, cookie Secure, versões de TLS e o fallback sem certificado; roda a
# suíte de navegador sobre HTTPS (se E2E_SENHA definida) e RESTAURA o modo original ao final.
set -euo pipefail
source "$(dirname "$0")/../lib.sh"; cd "$RAIZ"
MODO_ORIGINAL=$(valor_env TLS_MODO); MODO_ORIGINAL=${MODO_ORIGINAL:-desligado}
restaurar() {
  if [[ "$MODO_ORIGINAL" == "desligado" ]]; then infra/tls/desativar-tls.sh > /dev/null; fi
  docker compose up -d --wait nginx api > /dev/null 2>&1 || true
}
trap restaurar EXIT
falha() { echo "FALHOU: $*" >&2; exit 1; }

if [[ "$MODO_ORIGINAL" == "desligado" ]]; then
  echo "== ativando HTTPS autoassinado (temporário)"
  infra/tls/gerar-autoassinado.sh 127.0.0.1 localhost > /dev/null
  docker compose up -d --wait nginx api > /dev/null
fi
HTTP_HOST=${URL_HTTP#http://}

echo "== redirecionamento HTTP → HTTPS"
curl -sI "$URL_HTTP/app" | grep -qiE '^HTTP/1.1 301' || falha "HTTP não redireciona"
curl -s "$URL_HTTP/healthz" | grep -q ok || falha "/healthz deve continuar em HTTP"

echo "== cabeçalhos e cookie"
curl -skI "$URL_HTTPS/app" | grep -qi '^strict-transport-security: max-age=31536000' || falha "HSTS ausente"
curl -sI "$URL_HTTP/healthz" | grep -qi strict-transport && falha "HSTS não deve ir em HTTP"
curl -sk -D - -o /dev/null -XPOST "$URL_HTTPS/api/v1/auth/aluno/login" -H 'content-type: application/json' \
  -d '{"login":"x","senha":"y"}' > /dev/null
if [[ -n "${E2E_SENHA:-}" ]]; then
  curl -sk -D - -o /dev/null -XPOST "$URL_HTTPS/api/v1/auth/aluno/login" -H 'content-type: application/json' \
    -d "{\"login\":\"2026000001\",\"senha\":\"$E2E_SENHA\"}" | grep -i '^set-cookie' | grep -q 'Secure' || falha "cookie sem Secure"
fi

echo "== versões de TLS"
HOSTPORTA=${URL_HTTPS#https://}
for v in tls1_2 tls1_3; do
  echo | timeout 5 openssl s_client -connect "$HOSTPORTA" -$v 2>&1 | grep -q "New, TLSv" || falha "$v deveria ser aceito"
done
echo | timeout 5 openssl s_client -connect "$HOSTPORTA" -tls1_1 2>&1 | grep -q "New, TLSv" && falha "TLS 1.1 deveria ser recusado"

if [[ -n "${E2E_SENHA:-}" ]]; then
  echo "== suíte de navegador sobre HTTPS"
  # Logo após a etapa "navegador", os mesmos logins estourariam o limite de credenciais
  # (10/min por IP + conta — ADR-0011): espera a janela de 1 minuto zerar.
  sleep 61
  (cd apps/web && E2E_BASE_URL="$URL_HTTPS" E2E_IGNORAR_CERTIFICADO=true npx playwright test)
fi

echo "== fallback: Let's Encrypt sem certificado sobe em HTTP"
TLS_MODO=letsencrypt TLS_DOMINIO=sem-certificado.invalid docker compose up -d --wait nginx > /dev/null
docker compose logs nginx --since 30s | grep -q "certificado não encontrado" || falha "fallback não avisou"
curl -s "$URL_HTTP/healthz" | grep -q ok || falha "fallback não subiu em HTTP"
echo "OK: HTTPS (redirecionamento, HSTS, cookie Secure, TLS 1.2/1.3, fallback)"
