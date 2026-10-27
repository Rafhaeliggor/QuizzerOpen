#!/usr/bin/env bash
# Teste periódico (mensal) da restauração a partir da CÓPIA EXTERNA (feature 018, ADR-0030).
#
# Baixa do remoto rclone o dump e o arquivo de mídias mais recentes, decifra com a chave
# privada age, restaura o dump no banco separado quizzer_restaurado (o banco em uso não é
# tocado), confere as contagens, lista as mídias sem gravá-las e apaga o banco de conferência.
# Grava o resultado em BACKUP_DIR/.restauracao.json — o monitor avisa quando o último teste
# passa de MONITOR_RESTAURACAO_DIAS (35). Falha também chama o BACKUP_WEBHOOK_FALHA.
#
#   infra/backup/testar-copia-externa.sh --chave ~/quizzer-backup.key
#   infra/backup/testar-copia-externa.sh --chave <chave> --destino offsite:bucket/quizzer --manter
#
# A chave privada fica fora do VPS: traga-a só para o teste (ex.: scp) e apague em seguida.
set -euo pipefail

CHAVE=""; DESTINO=""; MANTER=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --chave) CHAVE="${2:-}"; shift ;;
    --destino) DESTINO="${2:-}"; shift ;;
    --manter) MANTER=1 ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
  shift
done
[[ -n "$CHAVE" ]] && CHAVE="$(cd "$(dirname "$CHAVE")" && pwd)/$(basename "$CHAVE")"

cd "$(dirname "$0")/../.."
TMP=$(mktemp -d); chmod 700 "$TMP"; trap 'rm -rf "$TMP"' EXIT

# Tudo que fala com o remoto roda num container descartável do serviço backup (rclone + config).
no_backup() {
  local env_destino=()
  [[ -n "$DESTINO" ]] && env_destino=(-e "BACKUP_RCLONE_DESTINO=$DESTINO")
  docker compose run --rm --no-deps -T "${env_destino[@]}" --entrypoint sh backup -c "$1"
}

registrar() { # registrar <ok|falha> <mensagem>
  local agora; agora=$(date -u +%FT%TZ)
  local msg=${2//\"/\'}
  if [[ "$1" == ok ]]; then
    no_backup "printf '%s\n' '{\"ultimoTeste\":\"$agora\",\"resultado\":\"$msg\"}' > /backups/.restauracao.json"
  else
    no_backup "ANT=\$(sed -n 's/.*\"ultimoTeste\":\"\\([^\"]*\\)\".*/\\1/p' /backups/.restauracao.json 2>/dev/null)
      printf '{\"ultimoTeste\":\"%s\",\"ultimaFalha\":\"$agora\",\"erro\":\"%s\"}\n' \"\$ANT\" '$msg' > /backups/.restauracao.json
      [ -z \"\${BACKUP_WEBHOOK_FALHA:-}\" ] || curl -fsS -m 15 -X POST -H 'Content-Type: application/json' \
        -d '{\"text\":\"[Quizzer] Teste de restauração da cópia externa falhou: $msg\"}' \"\$BACKUP_WEBHOOK_FALHA\" > /dev/null || true" || true
  fi
}
falhar() { echo "FALHOU: $*" >&2; registrar falha "$*"; exit 1; }

RCLONE='rclone --config "${RCLONE_CONFIG:-/config/rclone.conf}"'
DEST_CONF=$(no_backup 'printf %s "${BACKUP_RCLONE_DESTINO:-}"')
[[ -n "$DEST_CONF" ]] || { echo "BACKUP_RCLONE_DESTINO não configurado (ou use --destino)." >&2; exit 1; }

echo "==> Procurando o backup mais recente em $DEST_CONF"
LISTA=$(no_backup "$RCLONE lsf \"\$BACKUP_RCLONE_DESTINO\"") || falhar "não foi possível listar o remoto $DEST_CONF"
DUMP=$(grep -E '^quizzer-[0-9TZ]+\.dump(\.age)?$' <<<"$LISTA" | sort | tail -1 || true)
MIDIAS=$(grep -E '^midias-[0-9TZ]+\.tar\.gz(\.age)?$' <<<"$LISTA" | sort | tail -1 || true)
[[ -n "$DUMP" ]] || falhar "nenhum dump encontrado em $DEST_CONF"
if [[ "$DUMP" == *.age && -z "$CHAVE" ]]; then
  echo "Backup criptografado: informe --chave <arquivo da chave privada age>" >&2; exit 1
fi
echo "    dump: $DUMP · mídias: ${MIDIAS:-(nenhum)}"

echo "==> Baixando"
no_backup "$RCLONE cat \"\$BACKUP_RCLONE_DESTINO/$DUMP\"" > "$TMP/$DUMP" || falhar "download de $DUMP falhou"
[[ -s "$TMP/$DUMP" ]] || falhar "$DUMP baixado está vazio"

echo "==> Restaurando no banco de conferência (quizzer_restaurado)"
ARGS=("$TMP/$DUMP"); [[ -n "$CHAVE" ]] && ARGS+=(--chave "$CHAVE")
SAIDA=$(infra/backup/restaurar.sh "${ARGS[@]}" 2>&1) || { echo "$SAIDA" >&2; falhar "restauração de $DUMP falhou"; }
CONTAGENS=$(grep -E '^[a-z_]+\|[0-9]+$' <<<"$SAIDA" || true)
echo "$CONTAGENS"
USUARIOS=$(sed -n 's/^usuarios|//p' <<<"$CONTAGENS")
[[ "${USUARIOS:-0}" -gt 0 ]] || falhar "dump $DUMP restaurado sem usuários"
if [[ "$MANTER" == 0 ]]; then
  docker compose exec -T postgres psql -qU quizzer -d postgres -c "DROP DATABASE quizzer_restaurado WITH (FORCE)"
fi

QTD_MIDIAS=0
if [[ -n "$MIDIAS" ]]; then
  echo "==> Conferindo as mídias (sem gravar no volume em uso)"
  no_backup "$RCLONE cat \"\$BACKUP_RCLONE_DESTINO/$MIDIAS\"" > "$TMP/$MIDIAS" || falhar "download de $MIDIAS falhou"
  if [[ "$MIDIAS" == *.age ]]; then
    docker run --rm -i -v "$CHAVE":/chave:ro --entrypoint age quizzer-backup:latest -d -i /chave < "$TMP/$MIDIAS" > "$TMP/midias.tar.gz" \
      || falhar "não foi possível decifrar $MIDIAS"
  else
    mv "$TMP/$MIDIAS" "$TMP/midias.tar.gz"
  fi
  QTD_MIDIAS=$(docker run --rm -i --entrypoint tar quizzer-backup:latest -tzf - < "$TMP/midias.tar.gz" | grep -cv '/$' || true)
  docker run --rm -i --entrypoint tar quizzer-backup:latest -tzf - < "$TMP/midias.tar.gz" > /dev/null \
    || falhar "arquivo de mídias $MIDIAS ilegível"
  echo "    arquivos de mídia: $QTD_MIDIAS"
fi

registrar ok "$DUMP restaurado ($USUARIOS usuários), $QTD_MIDIAS mídia(s)"
echo "OK: cópia externa restaurável — resultado gravado em .restauracao.json"
