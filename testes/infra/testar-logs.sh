#!/usr/bin/env bash
# Testa a centralização de logs (ADR-0054) sem mexer na stack: sobe o coletor (Vector) numa
# porta própria, envia logs de um container descartável pelo driver fluentd do Docker e confere
# o arquivo por serviço/dia, o JSON da API virando objeto e a geração dos destinos externos.
set -euo pipefail
source "$(dirname "$0")/../lib.sh"; cd "$RAIZ"
TMP=$(mktemp -d)
NOME=qz-logs-teste; PORTA=24299
trap 'docker rm -f "$NOME" > /dev/null 2>&1 || true; docker volume rm qz-logs-teste-estado > /dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
falha() { echo "FALHOU: $*" >&2; exit 1; }
IMAGEM=$(sed -n 's/^ *image: *\(timberio\/vector:[^ ]*\).*/\1/p' docker-compose.logs.yml)

echo "== composição: todos os serviços usam o coletor, que fica no json-file"
CONF=$(COMPOSE_FILE=docker-compose.yml:docker-compose.logs.yml docker compose config --format json)
python3 - "$CONF" <<'PY' || falha "logging dos serviços incorreto"
import json, sys
c = json.loads(sys.argv[1])["services"]
assert c["logs"]["logging"]["driver"] == "json-file"
for nome, s in c.items():
    if nome != "logs":
        assert s["logging"]["driver"] == "fluentd", nome
        assert "max-size" not in s["logging"].get("options", {}), nome
PY

echo "== configuração do Vector (com destinos externos e caracteres especiais no token)"
mkdir -p "$TMP/dados"
docker run -d --name "$NOME" --read-only --tmpfs /tmp --cap-drop ALL \
  -e LOGS_ENCAMINHAR_HTTP=http://127.0.0.1:9/ingestao -e 'LOGS_ENCAMINHAR_TOKEN=a"b$c' -e LOGS_LOKI_URL=http://127.0.0.1:9 \
  -p "127.0.0.1:$PORTA:24224" -v "$PWD/infra/logs/vector.yaml:/etc/vector/vector.yaml:ro" \
  -v "$PWD/infra/logs/iniciar.sh:/etc/vector/iniciar.sh:ro" -v "$TMP/dados:/logs" -v qz-logs-teste-estado:/var/lib/vector \
  --entrypoint /bin/sh "$IMAGEM" /etc/vector/iniciar.sh > /dev/null
for _ in $(seq 1 20); do docker exec "$NOME" wget -qO- http://127.0.0.1:8686/health > /dev/null 2>&1 && break; sleep 1; done
docker exec "$NOME" wget -qO- http://127.0.0.1:8686/health | grep -q '"ok":true' || { docker logs "$NOME"; falha "coletor não ficou saudável"; }
docker exec "$NOME" grep -q 'token: "a\\"b\$\$c"' /tmp/destinos.yaml || falha "token não foi escapado"

echo "== envio pelo driver fluentd"
docker run --rm --name quizzer-servicoteste-1 --log-driver fluentd --log-opt "fluentd-address=127.0.0.1:$PORTA" \
  --log-opt 'tag={{.Name}}' alpine:3.22 sh -c 'echo "{\"level\":30,\"msg\":\"ola\"}"; echo texto puro'
for _ in $(seq 1 10); do ls "$TMP"/dados/*/servicoteste.log > /dev/null 2>&1 && break; sleep 1; done
ARQ=$(ls "$TMP/dados/$(date -u +%F)/servicoteste.log") || falha "arquivo do serviço não foi criado"
cat "$ARQ"
grep -q '"mensagem":{"level":30,"msg":"ola"}' "$ARQ" || falha "JSON não virou objeto"
grep -q '"mensagem":"texto puro"' "$ARQ" || falha "texto puro perdido"
grep -q '"servico":"servicoteste"' "$ARQ" || falha "nome do serviço não normalizado"

echo "OK: coletor de logs grava por serviço/dia mesmo com o destino externo fora do ar"
