#!/usr/bin/env bash
# HTTPS com certificado VÁLIDO do Let's Encrypt (exige DNS apontando para este servidor
# e as portas 80 e 443 liberadas no firewall).
#
#   infra/tls/ativar-letsencrypt.sh provas.instituicao.edu.br ti@instituicao.edu.br
#   infra/tls/ativar-letsencrypt.sh provas.instituicao.edu.br ti@instituicao.edu.br --staging   # teste
#   infra/tls/ativar-letsencrypt.sh 203-0-113-10.sslip.io --sem-email      # sem domínio próprio (ADR-0056)
#
# --sem-email: conta ACME sem e-mail (o Let's Encrypt não envia mais avisos de vencimento; quem
# avisa é o monitor e o uptime.yml).
source "$(dirname "$0")/_comum.sh"

DOMINIO="${1:-}"; EMAIL="${2:-}"; EXTRA="${3:-}"
[[ -n "$DOMINIO" && -n "$EMAIL" ]] || { echo "Uso: $0 <dominio> <email|--sem-email> [--staging]" >&2; exit 1; }

echo "==> Conferindo DNS de $DOMINIO"
getent hosts "$DOMINIO" || { echo "O domínio $DOMINIO ainda não resolve. Configure o DNS antes." >&2; exit 1; }

echo "==> Garantindo o Nginx no ar (o desafio ACME é servido pela porta 80)"
docker compose up -d nginx

if [[ "$EMAIL" == "--sem-email" ]]; then CONTA=(--register-unsafely-without-email); else CONTA=(--email "$EMAIL"); fi

echo "==> Emitindo o certificado"
docker compose --profile letsencrypt run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/acme -d "$DOMINIO" "${CONTA[@]}" \
  --agree-tos --no-eff-email --non-interactive $EXTRA

echo "==> Permitindo que o Nginx (sem root, grupo 101) leia o certificado"
docker compose --profile letsencrypt run --rm --entrypoint sh certbot -c \
  "chgrp -R 101 /etc/letsencrypt/live /etc/letsencrypt/archive && chmod 750 /etc/letsencrypt/live /etc/letsencrypt/archive && find /etc/letsencrypt/archive -name 'privkey*.pem' -exec chmod 640 {} +"

definir TLS_MODO letsencrypt
definir TLS_DOMINIO "$DOMINIO"
definir TLS_ATIVO true
definir COMPOSE_PROFILES letsencrypt
echo "==> Recriando nginx e api com HTTPS e ligando o renovador automático"
docker compose up -d nginx api certbot
echo "Pronto: https://$DOMINIO"
