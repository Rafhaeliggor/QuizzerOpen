#!/bin/sh
# Backup do PostgreSQL: gera, verifica, (opcional) criptografa, (opcional) copia para fora
# do VPS, aplica retenção e registra o status para o healthcheck/alerta. Ver ADR-0030.
#
# Variáveis:
#   PGHOST PGUSER PGPASSWORD PGDATABASE      conexão
#   BACKUP_RETENCAO_DIAS (7)                 retenção local e remota
#   BACKUP_AGE_DESTINATARIO                  chave pública age ("age1..."): cifra o backup;
#                                            o arquivo local passa a ser só o .age
#   BACKUP_RCLONE_DESTINO                    destino rclone ("remoto:bucket/quizzer"); config
#                                            por RCLONE_CONFIG_<REMOTO>_* ou /config/rclone.conf
#   BACKUP_WEBHOOK_FALHA                     URL que recebe POST JSON quando o backup falha
set -eu

DESTINO=/backups
RETENCAO_DIAS="${BACKUP_RETENCAO_DIAS:-7}"
CARIMBO=$(date -u +%Y%m%dT%H%M%SZ)
BASE="$DESTINO/${PGDATABASE}-${CARIMBO}.dump"
MIDIAS="$DESTINO/midias-${CARIMBO}.tar.gz"
STATUS="$DESTINO/.status.json"

log() { printf '{"time":"%s","service":"backup","level":"%s","msg":"%s"}\n' "$(date -u +%FT%TZ)" "$1" "$2"; }

falhar() {
  log error "$1"
  rm -f "$BASE.parcial" "$BASE.age.parcial" "$MIDIAS.parcial" "$MIDIAS.age.parcial"
  ANTERIOR=$(sed -n 's/.*"ultimoSucesso":"\([^"]*\)".*/\1/p' "$STATUS" 2>/dev/null || true)
  printf '{"ultimoSucesso":"%s","ultimaFalha":"%s","erro":"%s"}\n' "$ANTERIOR" "$(date -u +%FT%TZ)" "$1" > "$STATUS"
  if [ -n "${BACKUP_WEBHOOK_FALHA:-}" ]; then
    curl -fsS -m 15 -X POST -H 'Content-Type: application/json' \
      -d "{\"text\":\"[Quizzer] Falha no backup do PostgreSQL: $1\"}" "$BACKUP_WEBHOOK_FALHA" > /dev/null \
      || log error "falha ao chamar o webhook de alerta"
  fi
  exit 1
}

# 1. Gera em arquivo temporário e só promove depois de verificado.
pg_dump --format=custom --compress=6 --file="$BASE.parcial" || falhar "pg_dump falhou"
pg_restore --list "$BASE.parcial" > /dev/null || falhar "backup gerado está corrompido"

# 2. Criptografia (opcional, recomendada para cópia externa).
if [ -n "${BACKUP_AGE_DESTINATARIO:-}" ]; then
  age -r "$BACKUP_AGE_DESTINATARIO" -o "$BASE.age.parcial" "$BASE.parcial" || falhar "criptografia (age) falhou"
  rm -f "$BASE.parcial"
  mv "$BASE.age.parcial" "$BASE.age"
  FINAL="$BASE.age"
else
  mv "$BASE.parcial" "$BASE"
  FINAL="$BASE"
fi
chmod 600 "$FINAL"
log info "backup concluído: $(basename "$FINAL") ($(du -h "$FINAL" | cut -f1))"

# 2b. Mídias das questões (volume "midias", montado só leitura em /midias — ADR-0032).
FINAL_MIDIAS=""
if [ -d /midias ]; then
  tar -czf "$MIDIAS.parcial" -C /midias . || falhar "arquivamento das mídias falhou"
  if [ -n "${BACKUP_AGE_DESTINATARIO:-}" ]; then
    age -r "$BACKUP_AGE_DESTINATARIO" -o "$MIDIAS.age.parcial" "$MIDIAS.parcial" || falhar "criptografia das mídias falhou"
    rm -f "$MIDIAS.parcial"
    mv "$MIDIAS.age.parcial" "$MIDIAS.age"
    FINAL_MIDIAS="$MIDIAS.age"
  else
    mv "$MIDIAS.parcial" "$MIDIAS"
    FINAL_MIDIAS="$MIDIAS"
  fi
  chmod 600 "$FINAL_MIDIAS"
  log info "mídias arquivadas: $(basename "$FINAL_MIDIAS") ($(du -h "$FINAL_MIDIAS" | cut -f1))"
fi

# 3. Cópia para fora do VPS (opcional).
if [ -n "${BACKUP_RCLONE_DESTINO:-}" ]; then
  for ARQ in "$FINAL" $FINAL_MIDIAS; do
    rclone copy --config "${RCLONE_CONFIG:-/config/rclone.conf}" "$ARQ" "$BACKUP_RCLONE_DESTINO" \
      || falhar "cópia externa (rclone) para $BACKUP_RCLONE_DESTINO falhou"
  done
  rclone delete --config "${RCLONE_CONFIG:-/config/rclone.conf}" --min-age "${RETENCAO_DIAS}d" \
    --include "${PGDATABASE}-*.dump*" --include "midias-*.tar.gz*" "$BACKUP_RCLONE_DESTINO" || log error "retenção remota falhou"
  log info "cópia externa enviada para $BACKUP_RCLONE_DESTINO"
fi

# 4. Retenção local.
REMOVIDOS=$(find "$DESTINO" \( -name "${PGDATABASE}-*.dump*" -o -name "midias-*.tar.gz*" \) -type f -mmin +$((RETENCAO_DIAS * 1440)) -print -delete | wc -l)
[ "$REMOVIDOS" -gt 0 ] && log info "retenção: $REMOVIDOS backup(s) antigo(s) removido(s)"

printf '{"ultimoSucesso":"%s","arquivo":"%s","midias":"%s","copiaExterna":%s}\n' \
  "$(date -u +%FT%TZ)" "$(basename "$FINAL")" "$( [ -n "$FINAL_MIDIAS" ] && basename "$FINAL_MIDIAS")" "$([ -n "${BACKUP_RCLONE_DESTINO:-}" ] && echo true || echo false)" > "$STATUS"
exit 0
