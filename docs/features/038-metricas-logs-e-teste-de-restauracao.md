# 038 — Métricas de 5xx e latência, logs centralizados e teste periódico de restauração

- **Status:** Concluída (MVP). A ativação em produção depende do VPS real.
- **Sprint:** 10 (lote 9, 2026-10-19) · **Responsável:** Dev B
- **Requisitos:** RNF03, RNF05 · **ADRs:** [0054](../adr/0054-metricas-logs-centralizados-e-teste-de-restauracao.md), [0055](../adr/0055-hsts-preload.md)

## Objetivo

Fechar as pendências de operação que restavam no plano do Dev B:

- métricas de erro e latência (feature 026);
- centralização de logs (features 006 e 016);
- teste periódico da restauração a partir da cópia externa (feature 018);
- avaliação do HSTS preload (feature 017).

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Monitor | Mais de 5% das respostas da API são 5xx nos últimos 5 min (com ≥ 20 requisições) | Webhook "PROBLEMA: API com X% de respostas 5xx"; "RESOLVIDO" quando normaliza |
| 2 | Monitor | p95 da latência passa de 2000 ms | Webhook "PROBLEMA: API lenta: p95 de … ms" |
| 3 | Visitante | Abre `/api/v1/health/metricas` pelo navegador | 404 do Nginx, inclusive com maiúsculas ou barra no fim |
| 4 | TI | Liga `COMPOSE_FILE=docker-compose.yml:docker-compose.logs.yml` | Logs de todos os serviços em `logs/<data>/<serviço>.log`; com `LOGS_LOKI_URL` ou `LOGS_ENCAMINHAR_HTTP`, cópia fora do VPS |
| 5 | TI | Destino externo de logs fora do ar | A gravação local continua; o excedente para o destino externo é descartado |
| 6 | TI | Roda `infra/backup/testar-copia-externa.sh --chave …` uma vez por mês | Último backup do remoto restaurado em `quizzer_restaurado`, contagens exibidas, banco apagado, resultado em `.restauracao.json` |
| 7 | Monitor | Há cópia externa e o último teste de restauração tem mais de 35 dias (ou nunca foi feito) | Webhook "PROBLEMA: … teste de restauração" |
| 8 | TI | Teste de restauração falha (chave errada, remoto vazio, dump corrompido) | Código de saída 1, `ultimaFalha` registrada e alerta no `BACKUP_WEBHOOK_FALHA` |
| 9 | TI | Quizzer com domínio próprio registrável | `HSTS_PRELOAD=true` acrescenta `preload` no Nginx e na API; o verificador lembra a inscrição |

## Funcionamento

- **Métricas:** é o middleware `metricasHttp` em `configurarApp`, o primeiro da cadeia. A janela é deslizante, por minuto, guarda 60 minutos e usa um histograma com faixas de 50, 100, 250, 500, 1000, 2500, 5000 e 10000 ms. Os percentis informados são o limite da faixa. O health check e o fluxo SSE ficam fora da conta; as rotas de credencial (`/api/v1/auth/*`) entram na taxa de 5xx, mas não na latência (Argon2 lento de propósito — AJ-111). A cada rodada, o monitor grava `metricas janela=… requisicoes=… erros5xx=… taxa5xx=…% p95=…` no log (`p95=-` quando não houve requisições).
- **Logs:** cada serviço envia o stdout pelo driver `fluentd` (assíncrono) para o Vector, em `127.0.0.1:24224`. O Vector normaliza o nome do serviço, converte JSON em objeto e grava por dia. Uma limpeza a cada 6 h apaga as pastas mais antigas que `LOGS_RETENCAO_DIAS`. Os destinos externos só são gerados quando a variável está preenchida.
- **Restauração:** o script roda no host. Ele usa um container descartável do serviço `backup` para listar e baixar do remoto (rclone) e reaproveita o `restaurar.sh` para decifrar e restaurar.

## Interface

- `GET /api/v1/health/metricas?janela=1..60` é interno: só pela rede `backend-net`, bloqueado no Nginx. Resposta: `{janelaMin, requisicoes, erros5xx, taxa5xxPct, latenciaP50Ms, latenciaP95Ms, desdeInicio: {requisicoes, erros5xx, inicio}}`.
- `infra/backup/testar-copia-externa.sh --chave <arquivo> [--destino remoto:caminho] [--manter]`. A opção `--manter` deixa o `quizzer_restaurado` para conferência manual.

## Configuração

| Variável | Padrão | Uso |
|---|---|---|
| `MONITOR_5XX_PCT` | 5 | limite da taxa de 5xx (%) |
| `MONITOR_P95_MS` | 2000 | limite do p95 (ms) |
| `MONITOR_MIN_REQUISICOES` | 20 | mínimo de requisições na janela para avaliar |
| `MONITOR_RESTAURACAO_DIAS` | 35 | prazo do teste de restauração (0 desliga); só vale com `BACKUP_RCLONE_DESTINO` |
| `COMPOSE_FILE` | — | `docker-compose.yml:docker-compose.logs.yml` liga o coletor |
| `LOGS_DIR` / `LOGS_RETENCAO_DIAS` | `./logs` / 30 | pasta e retenção dos logs |
| `LOGS_ENCAMINHAR_HTTP` / `LOGS_ENCAMINHAR_TOKEN` | — | destino NDJSON externo (Bearer opcional) |
| `LOGS_LOKI_URL` | — | Grafana Loki externo |
| `HSTS_PRELOAD` | false | `preload` no HSTS (só domínio próprio — ADR-0055) |

## Testes

- Unitários: `apps/api/src/common/metricas/metricas-http.spec.ts` cobre a janela, os percentis, os minutos descartados e as rotas ignoradas.
- E2E da API: `test/integracao-e-operacao.e2e-spec.ts` verifica que a rota de métricas responde e não conta o health check.
- Bateria: a etapa `monitor` testa a rota bloqueada no Nginx e os alertas de 5xx, latência e restauração. A etapa `backup` roda o `testar-copia-externa.sh` contra um remoto simulado, com a chave certa e com a chave errada. A etapa nova `logs` (`testes/infra/testar-logs.sh`) testa o Compose, o escape do token, o driver fluentd e o arquivo por serviço.
- O verificador de produção mostra a situação dos logs centralizados, do teste de restauração e do HSTS preload.

## Pendências e limitações

- [ ] Ligar no VPS real: webhook, `BACKUP_RCLONE_DESTINO`, primeiro `testar-copia-externa.sh` e, se a instituição quiser, o coletor de logs com destino externo.
- [ ] Sem painel com séries históricas (Grafana). O histórico das métricas fica no log do monitor. Um Loki externo cobre isso, se a instituição tiver.
- [ ] Métricas em memória: um reinício da API zera a janela. Isso é suficiente com uma instância só.

## Arquivos principais

`apps/api/src/common/metricas/`, `apps/api/src/modules/health/health.controller.ts`, `infra/monitor/monitor.sh`, `infra/nginx/snippets-app.conf`, `docker-compose.logs.yml`, `infra/logs/`, `infra/backup/testar-copia-externa.sh`, `infra/vps/verificar-producao.sh`, `testes/infra/testar-logs.sh`.
