#!/usr/bin/env bash
# HTTPS com certificado AUTOASSINADO — para acesso por IP enquanto não há DNS.
# O navegador mostrará um aviso (certificado não confiável), mas o tráfego fica cifrado
# e os cookies passam a ser "Secure".
#
#   infra/tls/gerar-autoassinado.sh 203.0.113.10          # IP público do VPS
#   infra/tls/gerar-autoassinado.sh 203.0.113.10 provas.local
source "$(dirname "$0")/_comum.sh"

[[ $# -ge 1 ]] || { echo "Uso: $0 <IP-ou-nome> [outros nomes...]" >&2; exit 1; }
SAN=""
for alvo in "$@"; do
  if [[ "$alvo" =~ ^[0-9.]+$ || "$alvo" == *:* ]]; then SAN+="IP:$alvo,"; else SAN+="DNS:$alvo,"; fi
done
SAN="${SAN%,}"

echo "==> Gerando certificado autoassinado para: $SAN"
docker volume create "$VOLUME_CERTS" > /dev/null
docker run --rm -v "$VOLUME_CERTS":/certs alpine:3.22 sh -c "
  set -e
  apk add -q --no-cache openssl
  mkdir -p /certs/autoassinado
  openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes \
    -keyout /certs/autoassinado/privkey.pem -out /certs/autoassinado/fullchain.pem \
    -subj '/CN=$1/O=Quizzer' -addext 'subjectAltName=$SAN' 2>/dev/null
  chown -R 101:101 /certs/autoassinado
  chmod 640 /certs/autoassinado/privkey.pem
  openssl x509 -in /certs/autoassinado/fullchain.pem -noout -subject -enddate
"

definir TLS_MODO autoassinado
definir TLS_ATIVO true
echo "==> Recriando nginx e api com HTTPS"
docker compose up -d nginx api
echo "Pronto: acesse https://$1 (aceite o aviso do certificado no navegador)."
