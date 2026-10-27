#!/usr/bin/env bash
# Testa o monitor (ADR-0036) contra a stack no ar: com tudo saudável não alerta; com o backup
# atrasado, avisa por webhook; métricas de 5xx/latência (ADR-0054) e teste de restauração da
# cópia externa vencido também alertam. Restaura o status do backup ao final. Não altera o .env.
set -euo pipefail
source "$(dirname "$0")/../lib.sh"; cd "$RAIZ"
TMP=$(mktemp -d)
trap 'cp "$TMP/status.json" backups/.status.json 2>/dev/null || true; rm -rf "$TMP"; docker rm -f qz-webhook-monitor >/dev/null 2>&1 || true' EXIT
falha() { echo "FALHOU: $*" >&2; exit 1; }
rodada() { docker compose run --rm --no-deps -e MONITOR_UMA_VEZ=1 -e MONITOR_DISCO_PCT=100 -e MONITOR_WEBHOOK=http://qz-webhook-monitor:9000/ "$@" monitor 2>&1; }

echo "== imagem"
docker compose build -q monitor
cp backups/.status.json "$TMP/status.json"

echo "== receptor de webhook (responde 200 a cada chamada)"
docker run -d --name qz-webhook-monitor --network quizzer_frontend-net alpine:3.22 sh -c \
  'while true; do (sleep 1; printf "HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n") | nc -l -p 9000; echo; done' > /dev/null
sleep 2

echo "== tudo saudável: nenhum alerta"
printf '{"ultimoSucesso":"%s"}\n' "$(date -u +%FT%TZ)" > backups/.status.json
SAIDA=$(rodada)
echo "$SAIDA"
grep -q '"level":"warn"' <<<"$SAIDA" && falha "monitor alertou com a stack saudável"

echo "== backup atrasado: alerta por webhook"
echo '{"ultimoSucesso":"2020-01-01T00:00:00Z"}' > backups/.status.json
SAIDA=$(rodada)
echo "$SAIDA"
grep -q 'PROBLEMA: último backup' <<<"$SAIDA" || falha "monitor não detectou o backup atrasado"
sleep 2
docker logs qz-webhook-monitor 2>&1 | grep -q 'PROBLEMA: último backup' || falha "webhook não recebeu o alerta"

printf '{"ultimoSucesso":"%s"}\n' "$(date -u +%FT%TZ)" > backups/.status.json

echo "== métricas: só pela rede interna (Nginx devolve 404, inclusive com maiúsculas)"
for c in /api/v1/health/metricas /API/V1/Health/Metricas/ "/api/v1/health/metricas?janela=5"; do
  [[ "$(curl -s "${CURL_TLS[@]}" -o /dev/null -w '%{http_code}' "$URL_APP$c")" == 404 ]] || falha "Nginx expôs $c"
done
for _ in 1 2 3 4 5; do curl -s "${CURL_TLS[@]}" -o /dev/null "$URL_APP/api/v1/provas"; done
METRICAS=$(docker compose run --rm --no-deps --entrypoint curl monitor -fsS "http://api:3000/api/v1/health/metricas?janela=5")
echo "$METRICAS"
grep -q '"taxa5xxPct":' <<<"$METRICAS" || falha "API não devolveu as métricas"

echo "== taxa de 5xx e p95 acima do limite: alerta"
SAIDA=$(rodada -e MONITOR_MIN_REQUISICOES=0 -e MONITOR_5XX_PCT=-1 -e MONITOR_P95_MS=0)
echo "$SAIDA"
grep -q '"msg":"metricas janela=' <<<"$SAIDA" || falha "monitor não registrou as métricas no log"
grep -q 'PROBLEMA: API com' <<<"$SAIDA" || falha "monitor não alertou a taxa de 5xx"
grep -q 'PROBLEMA: API lenta' <<<"$SAIDA" || falha "monitor não alertou a latência"

echo "== cópia externa sem teste de restauração registrado: alerta"
mv backups/.restauracao.json "$TMP/restauracao.json" 2>/dev/null || true
SAIDA=$(rodada -e BACKUP_RCLONE_DESTINO=offsite:teste)
mv "$TMP/restauracao.json" backups/.restauracao.json 2>/dev/null || true
echo "$SAIDA"
grep -q 'PROBLEMA: nenhum teste de restauração' <<<"$SAIDA" || falha "monitor não cobrou o teste de restauração"

echo "OK: monitor silencioso quando saudável; alertas de backup, 5xx, latência e restauração entregues"
