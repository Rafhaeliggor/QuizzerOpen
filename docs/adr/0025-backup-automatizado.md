# ADR-0025: Backup automatizado do PostgreSQL

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF03, RNF05; plano Dev B Sprint 2 ("volume persistente + backup automatizado (cron simples)")

## Decisão

- Serviço `backup` no `docker-compose.yml` (imagem `postgres:18-alpine`, mesma versão do
  servidor): `pg_dump --format=custom` **ao subir e a cada `BACKUP_INTERVALO_HORAS` (24)**,
  retenção de **`BACKUP_RETENCAO_DIAS` (7)**, arquivos em `BACKUP_DIR` (`./backups`, permissão 600).
- Cada backup é escrito como `.parcial`, **verificado com `pg_restore --list`** e só então
  renomeado — um arquivo com nome de backup é sempre íntegro. Logs em JSON (stdout).
- `infra/backup/restaurar.sh` restaura **por padrão num banco separado** (`quizzer_restaurado`)
  e imprime contagens para conferência; sobrescrever o banco em uso exige `--sobrescrever`,
  digitar `RESTAURAR` e a API parada.
- Restauração testada: contagens idênticas ao banco de origem e o trigger de imutabilidade da
  auditoria preservado.

## Alternativas consideradas

- **Cron no host** — mais uma peça fora do Compose para configurar no VPS.
- **WAL/PITR (pgBackRest)** — melhor RPO, mas desproporcional ao MVP.

## Consequências

- RPO de até 24 h (configurável). **PENDENTE:** copiar `./backups` para fora do VPS (outro
  servidor/objeto), alertar falha de backup e criptografar os arquivos fora do host.
