# Imagem do serviço de backup: mesma versão do PostgreSQL do servidor + ferramentas
# para criptografar (age), copiar para fora do VPS (rclone) e alertar falhas (curl).
FROM postgres:18-alpine
RUN apk add --no-cache age rclone curl
COPY --chmod=755 backup.sh backup-loop.sh saude.sh /scripts/
HEALTHCHECK --interval=5m --timeout=10s --start-period=2m CMD sh /scripts/saude.sh
ENTRYPOINT ["/bin/sh", "/scripts/backup-loop.sh"]
