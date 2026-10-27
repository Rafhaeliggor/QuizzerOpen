#!/usr/bin/env bash
# Gera o par de chaves age para criptografar os backups.
#   - A chave PÚBLICA vai no .env (BACKUP_AGE_DESTINATARIO) — o VPS só consegue cifrar.
#   - A chave PRIVADA deve ser guardada FORA do VPS (cofre de senhas da TI). Sem ela, os
#     backups não podem ser restaurados.
set -euo pipefail
SAIDA="${1:-quizzer-backup.key}"
[[ -e "$SAIDA" ]] && { echo "$SAIDA já existe — não sobrescrevo." >&2; exit 1; }
docker run --rm --entrypoint age-keygen quizzer-backup:latest > "$SAIDA" 2>/dev/null
chmod 600 "$SAIDA"
echo "Chave privada: $SAIDA  (mova para fora do servidor!)"
echo "Chave pública (coloque no .env como BACKUP_AGE_DESTINATARIO):"
grep -o 'age1[0-9a-z]*' "$SAIDA"
