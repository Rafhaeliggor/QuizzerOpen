# ADR-0030: Backup criptografado, cópia externa e alerta de falha

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF03, RNF05
- **Complementa:** [ADR-0025](0025-backup-automatizado.md)

## Decisão

- Imagem própria `quizzer-backup` (postgres:18-alpine + `age` + `rclone` + `curl`).
- **Criptografia com chave pública `age`** (`BACKUP_AGE_DESTINATARIO`): o servidor só consegue
  cifrar; a chave privada fica **fora do VPS** (cofre da TI). Gerada por `infra/backup/gerar-chave.sh`.
  Com criptografia ligada, o arquivo local também é só o `.dump.age`.
- **Cópia externa com `rclone`** (`BACKUP_RCLONE_DESTINO`, configuração em
  `infra/backup/rclone/rclone.conf`, fora do git): S3, Backblaze B2, Google Drive, SFTP etc.
  Retenção aplicada também no destino.
- **Alerta:** em qualquer falha, POST JSON `{"text": …}` para `BACKUP_WEBHOOK_FALHA` (Slack,
  Teams, Google Chat) e status em `backups/.status.json`. **Healthcheck** do serviço fica
  `unhealthy` se o último sucesso tiver mais de 1,5 × o intervalo.
- Restauração de `.age`: `infra/backup/restaurar.sh <arquivo> --chave <chave-privada>`
  (decifra em container descartável, direto para o `pg_restore`).

## Consequências

- Validado: backup cifrado, cópia para remoto rclone (simulado com remoto local), restauração
  com a chave, recusa sem a chave, alerta por webhook numa falha forçada, healthcheck nos três casos.
- O serviço de backup ganhou acesso à `frontend-net` (saída para a internet) — necessário para a cópia externa.
