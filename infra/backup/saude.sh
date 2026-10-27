#!/bin/sh
# Healthcheck do serviço de backup: "unhealthy" se o último backup bem-sucedido for mais
# antigo que 1,5 × o intervalo (ou se nunca houve sucesso depois do período de carência).
STATUS=/backups/.status.json
LIMITE=$(( ${BACKUP_INTERVALO_HORAS:-24} * 3600 * 3 / 2 ))
ULTIMO=$(sed -n 's/.*"ultimoSucesso":"\([^"]*\)".*/\1/p' "$STATUS" 2>/dev/null)
[ -n "$ULTIMO" ] || exit 1
# O date do BusyBox não aceita "2026-10-11T02:07:46Z"; converte para "2026-10-11 02:07:46".
QUANDO=$(date -u -d "$(echo "$ULTIMO" | sed 's/T/ /; s/Z$//')" +%s 2>/dev/null) || exit 1
IDADE=$(( $(date -u +%s) - QUANDO ))
[ "$IDADE" -le "$LIMITE" ]
