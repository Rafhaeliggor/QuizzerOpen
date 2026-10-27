#!/bin/sh
# Sobe o coletor de logs (ADR-0054): gera os destinos externos opcionais, apaga as pastas diárias
# mais antigas que LOGS_RETENCAO_DIAS (30) e inicia o Vector.
#
#   LOGS_ENCAMINHAR_HTTP   URL que recebe NDJSON (Logstash http, Graylog, Better Stack, Elastic…)
#   LOGS_ENCAMINHAR_TOKEN  token "Bearer" opcional para o destino HTTP
#   LOGS_LOKI_URL          endpoint do Grafana Loki (ex.: https://loki.instituicao.edu.br)
set -eu
CONFIGS="--config /etc/vector/vector.yaml"
# Valor entre aspas duplas no YAML (escapa \, " e o $ da interpolação do Vector). Fica só no tmpfs.
yaml() { printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\$/$$/g')"; }
EXTRA=/tmp/destinos.yaml
: > "$EXTRA"

if [ -n "${LOGS_ENCAMINHAR_HTTP:-}" ] || [ -n "${LOGS_LOKI_URL:-}" ]; then
  echo "sinks:" >> "$EXTRA"
fi
if [ -n "${LOGS_ENCAMINHAR_HTTP:-}" ]; then
  cat >> "$EXTRA" <<CONF
  http_externo:
    type: http
    inputs: [normalizado]
    uri: $(yaml "$LOGS_ENCAMINHAR_HTTP")
    encoding:
      codec: json
    framing:
      method: newline_delimited
    # Destino externo lento ou fora do ar descarta o excedente em vez de travar o arquivo local.
    buffer:
      type: memory
      max_events: 10000
      when_full: drop_newest
CONF
  if [ -n "${LOGS_ENCAMINHAR_TOKEN:-}" ]; then
    cat >> "$EXTRA" <<CONF
    auth:
      strategy: bearer
      token: $(yaml "$LOGS_ENCAMINHAR_TOKEN")
CONF
  fi
fi
if [ -n "${LOGS_LOKI_URL:-}" ]; then
  cat >> "$EXTRA" <<CONF
  loki:
    type: loki
    inputs: [normalizado]
    endpoint: $(yaml "$LOGS_LOKI_URL")
    labels:
      sistema: quizzer
      servico: "{{ servico }}"
    encoding:
      codec: json
    # Destino externo lento ou fora do ar descarta o excedente em vez de travar o arquivo local.
    buffer:
      type: memory
      max_events: 10000
      when_full: drop_newest
CONF
fi
[ -s "$EXTRA" ] && CONFIGS="$CONFIGS --config $EXTRA"

RETENCAO=${LOGS_RETENCAO_DIAS:-30}
(
  while :; do
    find /logs -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$RETENCAO" -exec rm -rf {} + 2>/dev/null || true
    sleep 21600
  done
) &

# shellcheck disable=SC2086
exec vector $CONFIGS
