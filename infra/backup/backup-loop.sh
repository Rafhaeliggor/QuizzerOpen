#!/bin/sh
# Laço do serviço de backup: um backup ao subir e depois a cada BACKUP_INTERVALO_HORAS (padrão 24).
# Falha num ciclo não derruba o serviço — é logada, alertada e o próximo ciclo tenta de novo.
set -u
INTERVALO_HORAS="${BACKUP_INTERVALO_HORAS:-24}"
while true; do
  sh /scripts/backup.sh || true
  sleep $((INTERVALO_HORAS * 3600))
done
