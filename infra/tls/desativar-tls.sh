#!/usr/bin/env bash
# Volta para HTTP puro (ex.: certificado expirado durante manutenção). Não apaga certificados.
source "$(dirname "$0")/_comum.sh"
definir TLS_MODO desligado
definir TLS_ATIVO false
docker compose up -d nginx api
echo "HTTPS desligado."
