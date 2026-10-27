#!/usr/bin/env bash
# Testa o ciclo do backup na stack Docker: backup cifrado (age) + cópia para remoto rclone
# simulado + restauração num banco separado com conferência das contagens + recusa sem chave +
# alerta por webhook numa falha forçada + healthcheck. Não altera o .env nem o banco em uso.
set -euo pipefail
source "$(dirname "$0")/../lib.sh"; cd "$RAIZ"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"; docker rm -f qz-webhook-teste >/dev/null 2>&1 || true; rm -rf backups/remoto-teste' EXIT
falha() { echo "FALHOU: $*" >&2; exit 1; }

echo "== imagem e chave"
docker compose build -q backup
infra/backup/gerar-chave.sh "$TMP/chave.key" > /dev/null
PUB=$(grep -o 'age1[0-9a-z]*' "$TMP/chave.key")
mkdir -p "$TMP/rclone" && printf '[offsite]\ntype = local\n' > "$TMP/rclone/rclone.conf"

echo "== backup cifrado com cópia externa"
BACKUP_RCLONE_CONFIG_DIR="$TMP/rclone" docker compose run --rm --no-deps \
  -e BACKUP_AGE_DESTINATARIO="$PUB" -e BACKUP_RCLONE_DESTINO=offsite:/backups/remoto-teste \
  --entrypoint sh backup /scripts/backup.sh
ARQ=$(ls -t backups/*.dump.age | head -1)
head -c 21 "$ARQ" | grep -q "age-encryption.org/v1" || falha "arquivo não está cifrado"
[[ -f "backups/remoto-teste/$(basename "$ARQ")" ]] || falha "cópia externa não encontrada"
grep -q '"copiaExterna":true' backups/.status.json || falha "status sem cópia externa"

echo "== mídias das questões no mesmo backup (cifradas e copiadas)"
MID=$(ls -t backups/midias-*.tar.gz.age | head -1)
head -c 21 "$MID" | grep -q "age-encryption.org/v1" || falha "arquivo de mídias não está cifrado"
[[ -f "backups/remoto-teste/$(basename "$MID")" ]] || falha "cópia externa das mídias não encontrada"
# Decifra e lista o conteúdo sem gravar no volume em uso
docker run --rm -i -v "$TMP/chave.key":/chave:ro --entrypoint age quizzer-backup:latest -d -i /chave < "$MID" \
  | docker run --rm -i --entrypoint tar quizzer-backup:latest -tzf - > "$TMP/midias.lst" || falha "arquivo de mídias ilegível"
QTD_VOLUME=$(docker compose exec -T api sh -c 'ls /app/dados/midias | wc -l' | tr -d ' ')
QTD_ARQUIVO=$(grep -cE '^\./[0-9a-f]{32}$' "$TMP/midias.lst" || true)
[[ "$QTD_VOLUME" == "$QTD_ARQUIVO" ]] || falha "mídias no backup ($QTD_ARQUIVO) ≠ volume ($QTD_VOLUME)"

echo "== restauração exige a chave"
if infra/backup/restaurar.sh "$ARQ" > /dev/null 2>&1; then falha "restaurou .age sem chave"; fi

echo "== restauração com a chave (banco separado) e conferência"
SAIDA=$(infra/backup/restaurar.sh "$ARQ" --chave "$TMP/chave.key" | grep -E '^[a-z_]+\|[0-9]+$')
ORIGEM=$(docker compose exec -T postgres psql -U quizzer -d quizzer -At -c "
  SELECT 'usuarios', count(*) FROM iam.usuarios UNION ALL SELECT 'questoes', count(*) FROM questoes.questoes UNION ALL
  SELECT 'provas', count(*) FROM provas.provas UNION ALL SELECT 'tentativas', count(*) FROM aplicacao.tentativas UNION ALL
  SELECT 'notas', count(*) FROM correcao.notas UNION ALL SELECT 'eventos_auditoria', count(*) FROM auditoria.eventos;")
echo "$SAIDA"
# A auditoria pode crescer entre o backup e a conferência; as demais contagens devem bater.
diff <(grep -v eventos <<<"$SAIDA") <(grep -v eventos <<<"$ORIGEM") || falha "contagens restauradas diferem da origem"
docker compose exec -T postgres psql -qU quizzer -d quizzer_restaurado -c "DELETE FROM auditoria.eventos" > /dev/null 2>&1 \
  && falha "auditoria restaurada perdeu a proteção contra DELETE"
docker compose exec -T postgres psql -qU quizzer -d postgres -c "DROP DATABASE quizzer_restaurado WITH (FORCE)"

echo "== teste periódico da restauração a partir da cópia externa (testar-copia-externa.sh)"
cp backups/.restauracao.json "$TMP/restauracao.json" 2>/dev/null || true
BACKUP_RCLONE_CONFIG_DIR="$TMP/rclone" infra/backup/testar-copia-externa.sh \
  --chave "$TMP/chave.key" --destino offsite:/backups/remoto-teste || falha "teste da cópia externa falhou"
grep -q '"ultimoTeste":"' backups/.restauracao.json || falha "resultado do teste não foi registrado"
infra/backup/gerar-chave.sh "$TMP/outra.key" > /dev/null
BACKUP_RCLONE_CONFIG_DIR="$TMP/rclone" infra/backup/testar-copia-externa.sh \
  --chave "$TMP/outra.key" --destino offsite:/backups/remoto-teste > /dev/null 2>&1 && falha "restaurou com a chave errada"
grep -q '"ultimaFalha":"' backups/.restauracao.json || falha "falha do teste não foi registrada"
docker compose exec -T postgres psql -qU quizzer -d postgres -c "DROP DATABASE IF EXISTS quizzer_restaurado WITH (FORCE)"
if [[ -f "$TMP/restauracao.json" ]]; then cp "$TMP/restauracao.json" backups/.restauracao.json; else rm -f backups/.restauracao.json; fi

echo "== falha forçada dispara o webhook"
cp backups/.status.json "$TMP/status.json"
docker run -d --name qz-webhook-teste --network quizzer_frontend-net alpine:3.22 sh -c 'nc -l -p 9000 > /tmp/req; cat /tmp/req' > /dev/null
sleep 1
docker compose run --rm --no-deps -e PGPASSWORD=senha-errada -e BACKUP_WEBHOOK_FALHA=http://qz-webhook-teste:9000/alerta \
  --entrypoint sh backup /scripts/backup.sh > /dev/null 2>&1 && falha "backup com senha errada não falhou"
sleep 2
docker logs qz-webhook-teste 2>&1 | grep -q "Falha no backup" || falha "webhook não recebeu o alerta"
grep -q '"ultimaFalha"' backups/.status.json || falha "status não registrou a falha"
cp "$TMP/status.json" backups/.status.json

echo "== healthcheck"
docker compose up -d backup > /dev/null 2>&1; sleep 6
docker compose exec -T backup sh /scripts/saude.sh || falha "saúde com backup recente deveria passar"
cp backups/.status.json "$TMP/st2.json"
echo '{"ultimoSucesso":"2020-01-01T00:00:00Z"}' > backups/.status.json
docker compose exec -T backup sh /scripts/saude.sh && falha "saúde com backup antigo deveria falhar"
cp "$TMP/st2.json" backups/.status.json
rm -f backups/*.dump.age backups/midias-*.tar.gz.age
echo "OK: backup cifrado (banco + mídias), cópia externa, restauração (inclusive a partir do remoto), alerta e healthcheck"
