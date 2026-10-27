#!/bin/sh
# Recarrega o Nginx a cada 12 h para aplicar certificados renovados pelo certbot.
if [ "${TLS_MODO:-desligado}" = "letsencrypt" ]; then
  ( while sleep 43200; do nginx -s reload 2>/dev/null || true; done ) &
fi
