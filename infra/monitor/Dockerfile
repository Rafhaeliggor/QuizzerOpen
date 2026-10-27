# Monitor de operação (ADR-0036): checa API, Nginx, certificado TLS, backup e disco a cada
# MONITOR_INTERVALO_MIN e avisa por webhook quando algo quebra e quando volta ao normal.
FROM alpine:3.24
RUN apk add --no-cache curl openssl
COPY --chmod=755 monitor.sh /monitor.sh
# Roda como root SEM capacidades (cap_drop: ALL no compose): lê o status do backup, cuja pasta
# no host é 700/root, mas não ganha nenhum privilégio além de ser o dono desses arquivos.
HEALTHCHECK --interval=5m --timeout=5s --start-period=2m CMD test -f /tmp/monitor/ultima-execucao
ENTRYPOINT ["/bin/sh", "/monitor.sh"]
