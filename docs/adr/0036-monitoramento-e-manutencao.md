# ADR-0036: Monitoramento por webhook e manutenção contínua de dependências

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF03, RNF05; plano Dev B Sprint 4 (operação)

## Decisão

- **Serviço `monitor`** (Alpine + curl + openssl, ~10 MB, `read_only`, `cap_drop: ALL`): a cada
  `MONITOR_INTERVALO_MIN` (5) verifica **API** (`/api/v1/health`), **Nginx** (`/healthz`),
  **validade do certificado** (< `MONITOR_CERT_DIAS`, 14, quando o HTTPS está ligado), **backup em
  dia** (mesma regra do healthcheck do backup) e **disco** (> `MONITOR_DISCO_PCT`, 90%).
  Avisa por **webhook** (`MONITOR_WEBHOOK`, padrão = `BACKUP_WEBHOOK_FALHA`) só na **mudança de
  estado** (PROBLEMA / RESOLVIDO), repetindo a cada 24 h enquanto o problema continuar.
  Roda como root **sem capacidades** porque a pasta de backups do host é `700/root`.
- **Dependabot** semanal (npm agrupado em produção/desenvolvimento, imagens Docker, compose) e
  mensal para Actions. Todo PR passa pelo CI e por revisão humana.
- **Workflow `Segurança`** semanal: `npm audit --omit=dev --audit-level=moderate` (falha = e-mail do
  GitHub), mais o relatório completo informativo.

## Alternativas consideradas

- **Prometheus/Grafana/Uptime Kuma** — mais completos, mas pesados para 1 VPS e mais superfície; o
  webhook já chega no canal da equipe. Um monitor **externo** ao VPS (ex.: UptimeRobot) continua
  recomendado para detectar o VPS inteiro fora do ar (o monitor interno cai junto).
