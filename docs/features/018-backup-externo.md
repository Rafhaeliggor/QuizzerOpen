# 018 — Backup criptografado, cópia externa e alerta

- **Status:** Concluída com pendências
- **Sprint:** 6 (uso real) · **Responsável:** Dev B
- **Requisitos:** RNF03, RNF05 · **ADRs:** [0030](../adr/0030-backup-externo-criptografado.md), [0025](../adr/0025-backup-automatizado.md)
- Complementa a [feature 016](016-operacao-backup-e-carga.md) (backup local e restauração).

## Como funciona

A cada ciclo (padrão 24 h) o serviço `backup`:

1. gera o `pg_dump` e verifica a integridade;
2. **cifra** com a chave pública `age`, se `BACKUP_AGE_DESTINATARIO` estiver definida (o arquivo fica `.dump.age`);
3. **copia para fora do VPS** com `rclone`, se `BACKUP_RCLONE_DESTINO` estiver definido, e aplica a retenção lá também;
4. remove backups locais antigos e grava `backups/.status.json`.

Se qualquer passo falhar: log de erro, status com a falha e **POST no webhook** `BACKUP_WEBHOOK_FALHA`.
O Docker marca o serviço como `unhealthy` quando o último sucesso tem mais de 36 h (intervalo de 24 h).

## Configurar (uma vez)

```bash
docker compose build backup
infra/backup/gerar-chave.sh ~/quizzer-backup.key        # guarde a chave PRIVADA fora do VPS
# .env: BACKUP_AGE_DESTINATARIO=age1...   (chave pública impressa pelo script)

# Remoto rclone (ex.: bucket S3/B2) — o arquivo fica fora do git:
docker run --rm -it -v "$PWD/infra/backup/rclone:/config/rclone" rclone/rclone config
# .env: BACKUP_RCLONE_DESTINO=offsite:quizzer-backups
# .env: BACKUP_WEBHOOK_FALHA=https://hooks.slack.com/...   (ou Teams/Google Chat)
docker compose up -d backup
docker compose run --rm --entrypoint sh backup /scripts/backup.sh   # backup imediato de teste
```

## Restaurar backup cifrado

```bash
infra/backup/restaurar.sh backups/quizzer-20261011T020710Z.dump.age --chave ~/quizzer-backup.key
```

(Para restaurar a partir da cópia externa, baixe o arquivo com `rclone copy` antes.)

## Testes

Backup cifrado e cópia para remoto (simulado com remoto rclone local) → restauração com a chave
(contagens conferidas) → recusa sem chave → falha forçada (senha errada) gera alerta no webhook e
status de falha → healthcheck: recente ✅, 10 dias ❌, nunca ❌.

## Pendências

- [ ] Configurar o remoto real (bucket da instituição) e o webhook no VPS de produção.
- [x] Teste periódico da restauração a partir da cópia externa — `infra/backup/testar-copia-externa.sh` (mensal; o monitor cobra após 35 dias) — lote 9, [038](038-metricas-logs-e-teste-de-restauracao.md). Falta a primeira execução no ambiente real.
- [x] Monitor interno que alerta backup atrasado (e API/Nginx/certificado/disco) — lote 6, [026](026-monitoramento-e-manutencao.md); mídias das questões entram no backup — [021](021-formatos-midia-e-alto-risco.md).
- [x] Monitor externo ao VPS — `uptime.yml`, lote 7 ([031](031-relatorios-excel-e-indicios.md)).

## Arquivos

`infra/backup/{Dockerfile,backup.sh,backup-loop.sh,saude.sh,restaurar.sh,gerar-chave.sh}`, serviço `backup` no Compose.
