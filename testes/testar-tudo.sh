#!/usr/bin/env bash
# =============================================================================
# Executa TODOS os testes do Quizzer de uma vez e gera um relatório.
#
#   testes/testar-tudo.sh                         # tudo (senha do seed em E2E_SENHA)
#   testes/testar-tudo.sh --senha 'Quizzer@...'   # idem, informando a senha do seed
#   testes/testar-tudo.sh --rapido                # só estáticos, unitários e e2e da API
#   testes/testar-tudo.sh --etapas e2e,navegador  # etapas escolhidas
#
# Etapas (nesta ordem): estatico, unitarios, e2e, stack, navegador, carga, backup, monitor, logs, scripts, https, producao
#   estatico   typecheck + lint + npm audit
#   unitarios  Vitest da API e do frontend
#   e2e        API completa contra Postgres/Redis reais (sobe o docker-compose.dev.yml)
#   stack      reconstrói e sobe a stack Docker; aplica o seed de demonstração
#   navegador  Playwright: ciclo completo, formatos/mídia/impressão e Minha conta (HTTP)
#   carga      40 alunos simultâneos + limpeza dos dados criados
#   backup     backup cifrado (banco + mídias), cópia externa simulada, restauração (inclusive do remoto), alerta, healthcheck
#   monitor    monitor de operação: silêncio com tudo saudável; alertas de backup, 5xx, latência e restauração
#   logs       coletor de logs (Vector) isolado: driver fluentd, arquivo por serviço/dia, destinos externos
#   scripts    rotação da chave do MFA (simulação, sem gravar) e recusa de chave igual
#   https      modo autoassinado, cabeçalhos, TLS, Playwright sobre HTTPS, fallback (restaura o modo)
#   producao   verificar-producao.sh — INFORMATIVO (em homologação sempre há bloqueios)
#
# Relatório e logs: testes/resultados/<data-hora>/ (resumo.md + um .log por etapa).
# Requer: Node 24, Docker. Não altera o .env (o teste de HTTPS restaura o modo original).
# =============================================================================
set -uo pipefail
source "$(dirname "$0")/lib.sh"; cd "$RAIZ"

ETAPAS="estatico,unitarios,e2e,stack,navegador,carga,backup,monitor,logs,scripts,https,producao"
SENHA="${E2E_SENHA:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --rapido) ETAPAS="estatico,unitarios,e2e" ;;
    --etapas) ETAPAS="$2"; shift ;;
    --senha) SENHA="$2"; shift ;;
    -h|--help) sed -n '2,26p' "$0"; exit 0 ;;
    *) echo "Opção desconhecida: $1" >&2; exit 2 ;;
  esac
  shift
done
export E2E_SENHA="$SENHA"

PASTA="testes/resultados/$(date +%Y%m%d-%H%M%S)"; mkdir -p "$PASTA"
declare -a LINHAS; FALHAS=0

rodar() {  # rodar <etapa> <descrição> <informativa:0|1> <comando...>
  local etapa=$1 desc=$2 info=$3; shift 3
  [[ ",$ETAPAS," == *",$etapa,"* ]] || return 0
  printf '▶ %-10s %s … ' "$etapa" "$desc"
  local ini=$SECONDS
  if "$@" > "$PASTA/$etapa.log" 2>&1; then
    local r="✅ passou"
  elif [[ "$info" == 1 ]]; then
    local r="ℹ️ informativo (ver log)"
  else
    local r="❌ FALHOU"; FALHAS=$((FALHAS+1))
  fi
  local dur=$((SECONDS-ini))
  echo "$r (${dur}s)"
  LINHAS+=("| $etapa | $desc | $r | ${dur}s | [$etapa.log]($etapa.log) |")
}

precisa_senha() { [[ -n "$SENHA" ]] || { echo "Defina a senha do seed: --senha ou E2E_SENHA"; return 1; }; }

etapa_estatico()  { npm run typecheck && npm run lint && npm audit --omit=dev; }
etapa_unitarios() { npm test; }
etapa_e2e()       { docker compose -f docker-compose.dev.yml up -d --wait && npm run test:e2e; }
etapa_stack() {
  precisa_senha || return 1
  docker compose up -d --build --wait &&
  docker compose run --rm -e SEED_SENHA_PADRAO="$SENHA" -e SEED_PERMITIR_PRODUCAO=true migrate npx prisma db seed &&
  curl -fsS "${CURL_TLS[@]}" "$URL_APP/api/v1/health"
}
etapa_navegador() { precisa_senha && (cd apps/web && E2E_BASE_URL="$URL_APP" npx playwright test); }
etapa_carga() {
  precisa_senha || return 1
  node testes/carga/turma-simultanea.mjs --base "$URL_APP" --senha "$SENHA" --alunos 40
  local r=$?; testes/carga/limpar-dados-carga.sh; return $r
}
etapa_backup()   { testes/infra/testar-backup.sh; }
etapa_monitor()  { testes/infra/testar-monitor.sh; }
etapa_logs()     { testes/infra/testar-logs.sh; }
etapa_scripts()  { testes/infra/testar-scripts.sh; }
etapa_https()    { testes/infra/testar-https.sh; }
etapa_producao() { bash infra/vps/verificar-producao.sh; }

echo "Quizzer — bateria completa de testes ($(date '+%d/%m/%Y %H:%M')) — logs em $PASTA"
rodar estatico  "Typecheck, lint e npm audit"                      0 etapa_estatico
rodar unitarios "Testes unitários (API + frontend)"                0 etapa_unitarios
rodar e2e       "E2E da API (Postgres/Redis reais)"                0 etapa_e2e
rodar stack     "Stack Docker + seed de demonstração"              0 etapa_stack
rodar navegador "Playwright — ciclo completo e telas novas (HTTP)" 0 etapa_navegador
rodar carga     "Carga — 40 alunos simultâneos"                    0 etapa_carga
rodar backup    "Backup cifrado, cópia externa, restauração"       0 etapa_backup
rodar monitor   "Monitor (disponibilidade, 5xx, latência) e webhook" 0 etapa_monitor
rodar logs      "Centralização de logs (coletor Vector)"           0 etapa_logs
rodar scripts   "Scripts de operação (rotação da chave do MFA)"    0 etapa_scripts
rodar https     "HTTPS autoassinado, TLS, Playwright sobre HTTPS"  0 etapa_https
rodar producao  "Prontidão para produção (informativo)"            1 etapa_producao

{
  echo "# Resultado dos testes — $(date '+%d/%m/%Y %H:%M')"
  echo
  echo "| Etapa | Descrição | Resultado | Duração | Log |"
  echo "|---|---|---|---|---|"
  printf '%s\n' "${LINHAS[@]}"
  echo
  [[ $FALHAS -eq 0 ]] && echo "**Todas as etapas executadas passaram.**" || echo "**$FALHAS etapa(s) falharam** — veja os logs."
} > "$PASTA/resumo.md"
echo; cat "$PASTA/resumo.md"
exit $(( FALHAS > 0 ))
