#!/bin/sh
# Monitor de operação do Quizzer (ADR-0036). Sem dependências além de curl e openssl.
#
# Variáveis:
#   MONITOR_WEBHOOK           URL que recebe POST JSON {"text": "..."} (Slack, Teams, Discord,
#                             ntfy, Google Chat…). Vazio: só registra no log.
#   MONITOR_INTERVALO_MIN (5) intervalo entre as checagens
#   MONITOR_REPETIR_HORAS (24) reenvia o alerta de um problema que continua
#   MONITOR_CERT_DIAS (14)    alerta quando o certificado vence em menos que isso
#   MONITOR_DISCO_PCT (90)    alerta quando o disco dos backups passa disso
#   TLS_MODO, TLS_DOMINIO     iguais aos do Nginx
#   BACKUP_INTERVALO_HORAS    igual ao do serviço de backup
#   MONITOR_5XX_PCT (5)       alerta quando mais que isso % das respostas da API são 5xx (ADR-0054)
#   MONITOR_P95_MS (2000)     alerta quando o p95 da latência da API passa disso
#   MONITOR_MIN_REQUISICOES (20) abaixo disso na janela, 5xx/latência não são avaliados
#   MONITOR_RESTAURACAO_DIAS (35) alerta quando o último teste de restauração da cópia externa
#                             (infra/backup/testar-copia-externa.sh) passa disso; 0 desliga
#   MONITOR_ATRASO_INICIAL_S (60) carência antes da 1ª rodada (reinícios da stack)
#   MONITOR_UMA_VEZ=1         roda uma rodada e sai (testes) — sem carência
set -u

ESTADO=/tmp/monitor
mkdir -p "$ESTADO"
INTERVALO=$(( ${MONITOR_INTERVALO_MIN:-5} * 60 ))
REPETIR=$(( ${MONITOR_REPETIR_HORAS:-24} * 3600 ))

log() { printf '{"time":"%s","service":"monitor","level":"%s","msg":"%s"}\n' "$(date -u +%FT%TZ)" "$1" "$2"; }

avisar() {
  log warn "$1"
  [ -n "${MONITOR_WEBHOOK:-}" ] || return 0
  TEXTO=$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g')
  curl -fsS -m 15 -X POST -H 'Content-Type: application/json' \
    -d "{\"text\":\"[Quizzer] $TEXTO\"}" "$MONITOR_WEBHOOK" > /dev/null || log error "falha ao chamar o webhook"
}

# registrar <nome> <ok|falha> <mensagem>: avisa só na mudança de estado (e repete a cada REPETIR).
registrar() {
  NOME=$1; SITUACAO=$2; MSG=$3
  ARQ="$ESTADO/$NOME"
  AGORA=$(date -u +%s)
  if [ "$SITUACAO" = falha ]; then
    if [ ! -f "$ARQ" ]; then
      echo "$AGORA" > "$ARQ"; avisar "PROBLEMA: $MSG"
    elif [ $(( AGORA - $(cat "$ARQ") )) -ge "$REPETIR" ]; then
      echo "$AGORA" > "$ARQ"; avisar "AINDA COM PROBLEMA: $MSG"
    fi
  elif [ -f "$ARQ" ]; then
    rm -f "$ARQ"; avisar "RESOLVIDO: $MSG"
  fi
}

checar_api() {
  if curl -fsS -m 10 http://api:3000/api/v1/health > /dev/null 2>&1; then
    registrar api ok "API respondendo"
  else
    registrar api falha "API não responde ao health check (http://api:3000/api/v1/health)"
  fi
}

checar_nginx() {
  if curl -fsS -m 10 http://nginx:8080/healthz > /dev/null 2>&1; then
    registrar nginx ok "Nginx respondendo"
  else
    registrar nginx falha "Nginx não responde (/healthz)"
  fi
}

# 5xx e latência da API na janela do intervalo (ADR-0054). Cada rodada registra a métrica no log.
checar_metricas() {
  JANELA=${MONITOR_INTERVALO_MIN:-5}
  J=$(curl -fsS -m 10 "http://api:3000/api/v1/health/metricas?janela=$JANELA" 2>/dev/null) || return 0
  J=${J%%,\"desdeInicio\"*}
  campo() { printf '%s' "$J" | sed -n "s/.*\"$1\":\([0-9.nul]*\).*/\1/p"; }
  REQ=$(campo requisicoes); ERR=$(campo erros5xx); TAXA=$(campo taxa5xxPct); P95=$(campo latenciaP95Ms)
  [ -n "$REQ" ] || return 0
  log info "metricas janela=${JANELA}min requisicoes=$REQ erros5xx=$ERR taxa5xx=${TAXA}% p95=$([ "$P95" = null ] && echo "-" || echo "${P95}ms")"
  MINIMO=${MONITOR_MIN_REQUISICOES:-20}
  [ "$REQ" -ge "$MINIMO" ] || { registrar erros5xx ok "taxa de erros 5xx normal"; registrar latencia ok "latência normal"; return 0; }
  LIM_5XX=${MONITOR_5XX_PCT:-5}
  if awk -v t="$TAXA" -v l="$LIM_5XX" 'BEGIN { exit !(t > l) }'; then
    registrar erros5xx falha "API com ${TAXA}% de respostas 5xx nos últimos $JANELA min ($ERR de $REQ; limite ${LIM_5XX}%)"
  else
    registrar erros5xx ok "taxa de erros 5xx normal (${TAXA}%)"
  fi
  LIM_P95=${MONITOR_P95_MS:-2000}
  if [ "$P95" != null ] && [ "$P95" -gt "$LIM_P95" ]; then
    registrar latencia falha "API lenta: p95 de ${P95} ms nos últimos $JANELA min (limite $LIM_P95 ms)"
  else
    registrar latencia ok "latência normal (p95 ${P95} ms)"
  fi
}

checar_certificado() {
  [ "${TLS_MODO:-desligado}" = desligado ] && return 0
  NOME_SNI=${TLS_DOMINIO:-localhost}
  CERT=$(echo | openssl s_client -connect nginx:8443 -servername "$NOME_SNI" 2>/dev/null | openssl x509 2>/dev/null)
  if [ -z "$CERT" ]; then
    registrar certificado falha "não foi possível ler o certificado TLS em nginx:8443"
    return 0
  fi
  DIAS=${MONITOR_CERT_DIAS:-14}
  FIM=$(printf '%s\n' "$CERT" | openssl x509 -noout -enddate | cut -d= -f2)
  if printf '%s\n' "$CERT" | openssl x509 -noout -checkend $(( DIAS * 86400 )) > /dev/null; then
    registrar certificado ok "certificado TLS válido até $FIM"
  else
    registrar certificado falha "certificado TLS vence em menos de $DIAS dias ($FIM) — confira a renovação"
  fi
}

checar_backup() {
  STATUS=/backups/.status.json
  LIMITE=$(( ${BACKUP_INTERVALO_HORAS:-24} * 3600 * 3 / 2 ))
  ULTIMO=$(sed -n 's/.*"ultimoSucesso":"\([^"]*\)".*/\1/p' "$STATUS" 2>/dev/null)
  if [ -z "$ULTIMO" ]; then
    registrar backup falha "nenhum backup bem-sucedido registrado"
    return 0
  fi
  QUANDO=$(date -u -d "$(echo "$ULTIMO" | sed 's/T/ /; s/Z$//')" +%s 2>/dev/null || echo 0)
  IDADE=$(( $(date -u +%s) - QUANDO ))
  if [ "$IDADE" -le "$LIMITE" ]; then
    registrar backup ok "backup em dia (último: $ULTIMO)"
  else
    registrar backup falha "último backup bem-sucedido em $ULTIMO (mais de $(( LIMITE / 3600 )) h)"
  fi
}

# Teste periódico de restauração a partir da cópia externa (feature 018).
checar_restauracao() {
  DIAS=${MONITOR_RESTAURACAO_DIAS:-35}
  [ "$DIAS" -gt 0 ] || return 0
  ULTIMO=$(sed -n 's/.*"ultimoTeste":"\([^"]*\)".*/\1/p' /backups/.restauracao.json 2>/dev/null)
  if [ -z "$ULTIMO" ]; then
    registrar restauracao falha "nenhum teste de restauração da cópia externa registrado (rode infra/backup/testar-copia-externa.sh)"
    return 0
  fi
  QUANDO=$(date -u -d "$(echo "$ULTIMO" | sed 's/T/ /; s/Z$//')" +%s 2>/dev/null || echo 0)
  if [ $(( $(date -u +%s) - QUANDO )) -le $(( DIAS * 86400 )) ]; then
    registrar restauracao ok "teste de restauração em dia (último: $ULTIMO)"
  else
    registrar restauracao falha "último teste de restauração da cópia externa em $ULTIMO (mais de $DIAS dias)"
  fi
}

checar_disco() {
  LIMITE=${MONITOR_DISCO_PCT:-90}
  USO=$(df -P /backups 2>/dev/null | awk 'NR==2 {gsub("%","",$5); print $5}')
  [ -n "$USO" ] || return 0
  if [ "$USO" -lt "$LIMITE" ]; then
    registrar disco ok "disco em ${USO}%"
  else
    registrar disco falha "disco do servidor em ${USO}% (limite ${LIMITE}%)"
  fi
}

log info "monitor iniciado (intervalo ${INTERVALO}s, webhook $([ -n "${MONITOR_WEBHOOK:-}" ] && echo configurado || echo ausente))"
[ "${MONITOR_UMA_VEZ:-0}" = 1 ] || sleep "${MONITOR_ATRASO_INICIAL_S:-60}"
while :; do
  checar_api
  checar_nginx
  checar_certificado
  checar_metricas
  checar_backup
  [ -n "${BACKUP_RCLONE_DESTINO:-}" ] && checar_restauracao
  checar_disco
  date -u +%s > "$ESTADO/ultima-execucao"
  [ "${MONITOR_UMA_VEZ:-0}" = 1 ] && exit 0
  sleep "$INTERVALO"
done
