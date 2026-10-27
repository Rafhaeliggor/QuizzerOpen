#!/usr/bin/env bash
# Restaura um backup gerado pelo serviço `backup`.
#
# Por segurança, o padrão é restaurar num banco SEPARADO (quizzer_restaurado) para conferência:
#   infra/backup/restaurar.sh backups/quizzer-20261010T120000Z.dump
#
# Para substituir o banco em uso (desastre), pare a API antes e confirme explicitamente:
#   docker compose stop api nginx
#   infra/backup/restaurar.sh backups/<arquivo>.dump --sobrescrever
#   docker compose up -d
#
# Backup criptografado (.dump.age): informe a chave PRIVADA do age (guardada fora do VPS):
#   infra/backup/restaurar.sh backups/<arquivo>.dump.age --chave ~/quizzer-backup.key
#
# Mídias das questões (arquivo midias-<data>.tar.gz[.age], gerado junto com o dump):
# restaura no volume "midias" (acrescenta/substitui arquivos; não apaga os que já existem).
#   infra/backup/restaurar.sh backups/midias-<data>.tar.gz.age --chave ~/quizzer-backup.key
set -euo pipefail

ARQUIVO="${1:-}"; shift || true
MODO=""; CHAVE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --sobrescrever) MODO="--sobrescrever" ;;
    --chave) CHAVE="${2:-}"; shift ;;
    *) echo "Opção desconhecida: $1" >&2; exit 1 ;;
  esac
  shift
done
if [[ -z "$ARQUIVO" || ! -f "$ARQUIVO" ]]; then
  echo "Uso: $0 <arquivo.dump[.age]|midias-<data>.tar.gz[.age]> [--chave <chave-age>] [--sobrescrever]" >&2
  exit 1
fi
ARQUIVO="$(cd "$(dirname "$ARQUIVO")" && pwd)/$(basename "$ARQUIVO")"
[[ -n "$CHAVE" ]] && CHAVE="$(cd "$(dirname "$CHAVE")" && pwd)/$(basename "$CHAVE")"
if [[ "$ARQUIVO" == *.age && -z "$CHAVE" ]]; then
  echo "Backup criptografado: informe --chave <arquivo da chave privada age>" >&2
  exit 1
fi

cd "$(dirname "$0")/../.."
compose() { docker compose "$@"; }

decifrar() {
  if [[ "$ARQUIVO" == *.age ]]; then
    # Decifra num container descartável (a chave privada nunca é copiada para o VPS em disco).
    docker run --rm -i -v "$CHAVE":/chave:ro --entrypoint age quizzer-backup:latest -d -i /chave < "$ARQUIVO"
  else
    cat "$ARQUIVO"
  fi
}

if [[ "$(basename "$ARQUIVO")" == midias-* ]]; then
  VOLUME="$(compose config --format json 2>/dev/null | sed -n 's/.*"name": *"\([^"]*\)".*/\1/p' | head -1)_midias"
  [[ "$VOLUME" == _midias ]] && VOLUME=quizzer_midias
  read -r -p "Restaurar as mídias de '$ARQUIVO' no volume '$VOLUME'? Digite RESTAURAR: " confirma
  [[ "$confirma" == "RESTAURAR" ]] || { echo "Cancelado."; exit 1; }
  docker volume inspect "$VOLUME" > /dev/null 2>&1 || docker volume create "$VOLUME" > /dev/null
  decifrar | docker run --rm -i -v "$VOLUME":/midias --entrypoint tar quizzer-backup:latest -xzf - -C /midias
  echo "==> Conferência"
  docker run --rm -v "$VOLUME":/midias:ro --entrypoint sh quizzer-backup:latest -c 'echo "arquivos: $(find /midias -type f | wc -l)"'
  echo "Mídias restauradas em '$VOLUME'."
  exit 0
fi

if [[ "$MODO" == "--sobrescrever" ]]; then
  ALVO=quizzer
  read -r -p "Isto APAGA o banco '$ALVO' e restaura '$ARQUIVO'. Digite RESTAURAR para continuar: " confirma
  [[ "$confirma" == "RESTAURAR" ]] || { echo "Cancelado."; exit 1; }
  if compose ps --status running --services | grep -qx api; then
    echo "Pare a API antes (docker compose stop api nginx)." >&2
    exit 1
  fi
else
  ALVO=quizzer_restaurado
fi

echo "==> Recriando o banco $ALVO"
compose exec -T postgres psql -v ON_ERROR_STOP=1 -U quizzer -d postgres \
  -c "DROP DATABASE IF EXISTS $ALVO WITH (FORCE);" -c "CREATE DATABASE $ALVO OWNER quizzer;"

echo "==> Restaurando $ARQUIVO"
decifrar | compose exec -T postgres pg_restore --no-owner --exit-on-error -U quizzer -d "$ALVO"

echo "==> Conferência (linhas por tabela principal)"
compose exec -T postgres psql -U quizzer -d "$ALVO" -At -c "
  SELECT 'usuarios', count(*) FROM iam.usuarios UNION ALL
  SELECT 'questoes', count(*) FROM questoes.questoes UNION ALL
  SELECT 'provas', count(*) FROM provas.provas UNION ALL
  SELECT 'tentativas', count(*) FROM aplicacao.tentativas UNION ALL
  SELECT 'notas', count(*) FROM correcao.notas UNION ALL
  SELECT 'eventos_auditoria', count(*) FROM auditoria.eventos;"
echo "Restauração concluída em '$ALVO'."
