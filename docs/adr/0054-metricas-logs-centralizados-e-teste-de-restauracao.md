# ADR-0054: Métricas de 5xx e latência, logs centralizados e teste periódico de restauração

- **Status:** Aceito
- **Data:** 2026-10-19
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF03 (disponibilidade), RNF05 (segurança); pendências das features 006, 016, 018 e 026

## Contexto

O monitor (ADR-0036) e o uptime externo (ADR-0046) só verificam se a API e o Nginx respondem. Ficavam três lacunas:

1. **Não havia métricas.** Uma API que responde ao health check mas devolve 5xx em parte das requisições, ou que está lenta, não gerava alerta.
2. **Os logs não eram centralizados.** Cada serviço grava o stdout no `json-file` do Docker, com rotação. Para investigar, é preciso rodar `docker compose logs` serviço a serviço, e os logs se perdem junto com o VPS.
3. **A cópia externa nunca era restaurada na prática.** O backup é verificado ao ser gerado (`pg_restore --list`), mas nada garantia que o arquivo no remoto pudesse ser baixado, decifrado e restaurado.

O VPS é pequeno e a equipe também. Prometheus, Grafana e Elasticsearch completos estão fora de proporção.

## Decisão

**Métricas na própria API, sem dependência nova.**
- Um middleware Express (`src/common/metricas/metricas-http.ts`) conta, por minuto e numa janela deslizante de 60 minutos, as requisições, os 5xx e um histograma de latência com faixas de 50 ms a 10 s.
- O health check e o fluxo SSE ficam de fora: o primeiro é trivial, o segundo é uma conexão longa e distorceria a latência.
- As rotas de credencial (`/api/v1/auth/*`) contam para a taxa de 5xx, mas **não para a latência**. Ajustado em 2026-10-26 (AJ-111): o Argon2 é lento de propósito, e 40 alunos trocando a senha juntos davam p95 de 2,5 s, um alarme falso a cada início de prova.
- `GET /api/v1/health/metricas?janela=N` devolve as contagens, a taxa de 5xx e os percentis p50 e p95, pelo limite da faixa. São só contagens, sem dado pessoal. Mesmo assim, o Nginx devolve 404 para essa rota, sem diferenciar maiúsculas, porque o roteamento do Express também não diferencia. Só o monitor a lê, direto em `api:3000`.
- A cada rodada, o monitor registra a métrica no log. Ele alerta por webhook quando a taxa de 5xx passa de `MONITOR_5XX_PCT` (5%) ou o p95 passa de `MONITOR_P95_MS` (2000 ms). Abaixo de `MONITOR_MIN_REQUISICOES` (20) requisições na janela, não avalia, para evitar alarme com um erro em dois acessos de madrugada.
- Os contadores ficam em memória e são por processo. Um reinício zera a janela, o que é aceitável com uma única instância da API.

**Logs centralizados, opcionais, com Vector.**
- O `docker-compose.logs.yml` soma ao Compose um coletor Vector (`timberio/vector:0.60.0-alpine`, `read_only`, `cap_drop: ALL`). Ele troca o driver de log de todos os serviços para `fluentd`, apontado para o coletor. Liga-se com `COMPOSE_FILE=docker-compose.yml:docker-compose.logs.yml`.
- O coletor grava um arquivo por serviço e por dia em `LOGS_DIR/<data>/<serviço>.log`, com o JSON das mensagens já como objeto, e apaga as pastas com mais de `LOGS_RETENCAO_DIAS` (30).
- Opcionalmente, encaminha os logs para fora do VPS: NDJSON por HTTP (`LOGS_ENCAMINHAR_HTTP`, com token Bearer opcional) e/ou Grafana Loki (`LOGS_LOKI_URL`). O buffer desses destinos descarta o excedente (`drop_newest`) em vez de travar a gravação local.
- O driver `fluentd` é usado com `fluentd-async`: se o coletor cair, os serviços continuam rodando. O cache local do Docker (≥ 20.10) mantém o `docker compose logs` funcionando.
- O coletor publica a porta só em `127.0.0.1`, porque quem conecta é o daemon do Docker no host. O verificador de produção aceita essa exceção.
- Descartados: ler o socket do Docker (equivale a root, mesmo montado como somente leitura), Loki + Grafana no próprio VPS (pesado) e o driver `syslog` (exige trocar opções por serviço e não grava arquivo local).

**Teste periódico da restauração a partir da cópia externa.**
- `infra/backup/testar-copia-externa.sh --chave <chave privada age>` baixa do remoto o dump e as mídias mais recentes. Em seguida, decifra, restaura o dump no banco separado `quizzer_restaurado` (o banco em uso não é tocado), confere as contagens, lista as mídias sem gravá-las e apaga o banco de conferência.
- O resultado vai para `BACKUP_DIR/.restauracao.json`. Em caso de falha, o script chama o `BACKUP_WEBHOOK_FALHA`.
- O teste é manual e mensal, porque precisa da chave **privada**, que por decisão (ADR-0030) não fica no VPS. Para não depender só de memória, o monitor cobra o teste quando há cópia externa e o último tem mais de `MONITOR_RESTAURACAO_DIAS` (35 dias). O verificador de produção mostra a mesma informação.

## Consequências

- Uma API degradada (5xx ou lenta) passa a gerar alerta, não apenas uma API fora do ar. Ainda não há painel com séries históricas: o histórico fica no log do monitor, que vai para o coletor quando ele está ligado.
- Os logs centralizados são opcionais. Sem o arquivo extra, nada muda. Com ele, a investigação passa a ser por `grep` numa pasta só e, com destino externo, os logs sobrevivem à perda do VPS.
- O teste de restauração continua dependendo de uma pessoa com a chave. O ganho é que o esquecimento agora gera alerta.
- A bateria ganhou a etapa `logs` (`testes/infra/testar-logs.sh`). As etapas `monitor` e `backup` passaram a cobrir as métricas e o teste da cópia externa.
