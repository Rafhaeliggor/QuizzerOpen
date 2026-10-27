# 026 — Monitoramento, manutenção de dependências e limpeza de sessões

- **Status:** Concluída com pendências (só a configuração no ambiente real)
- **Sprint:** 7 (lote 6) · **Responsável:** Dev B
- **Requisitos:** RNF03, RNF05 · **ADRs:** [0036](../adr/0036-monitoramento-e-manutencao.md)

## Funcionamento

- Serviço `monitor` no `docker-compose.yml` (`infra/monitor/`): API, Nginx, certificado, backup e
  disco a cada 5 min — e, desde o lote 9, taxa de 5xx, p95 da latência e prazo do teste de
  restauração da cópia externa ([038](038-metricas-logs-e-teste-de-restauracao.md)); webhook só na mudança de estado (PROBLEMA/RESOLVIDO) e repetição diária.
  Logs: `docker compose logs monitor`.
- `.github/dependabot.yml` e `.github/workflows/seguranca.yml` (npm audit semanal).
- Limpeza de sessões antigas dentro da API (6 h).

## Configuração

`MONITOR_WEBHOOK` (padrão: `BACKUP_WEBHOOK_FALHA`), `MONITOR_INTERVALO_MIN` (5),
`MONITOR_CERT_DIAS` (14), `MONITOR_DISCO_PCT` (90), `MONITOR_REPETIR_HORAS` (24); lote 9:
`MONITOR_5XX_PCT` (5), `MONITOR_P95_MS` (2000), `MONITOR_MIN_REQUISICOES` (20), `MONITOR_RESTAURACAO_DIAS` (35).

## Testes

`testes/infra/testar-monitor.sh` (silêncio com tudo saudável; alerta por webhook com backup atrasado;
rota de métricas bloqueada no Nginx; alertas de 5xx, latência e teste de restauração — lote 9).

## Pendências e limitações

- [x] Monitor externo pelo GitHub Actions (`uptime.yml`, ligar com `URL_PRODUCAO`) — lote 7, [031](031-relatorios-excel-e-indicios.md).
- [x] Métricas (latência, erros 5xx) — lote 9, [038](038-metricas-logs-e-teste-de-restauracao.md) (ADR-0054).
- [ ] Ligar `URL_PRODUCAO` (uptime externo) e `MONITOR_WEBHOOK` no ambiente real.
