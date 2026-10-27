#!/usr/bin/env bash
# Verificação de prontidão para produção — SOMENTE LEITURA (não altera nada).
#   bash infra/vps/verificar-producao.sh
# Saída: ✅ ok · ⚠️ atenção · ❌ bloqueia o uso real. Código de saída 1 se houver ❌.
set -uo pipefail
cd "$(dirname "$0")/../.."

OK=0; ATENCAO=0; BLOQUEIO=0
ok()       { echo "✅ $*"; OK=$((OK+1)); }
atencao()  { echo "⚠️  $*"; ATENCAO=$((ATENCAO+1)); }
bloqueio() { echo "❌ $*"; BLOQUEIO=$((BLOQUEIO+1)); }
valor()    { grep -E "^$1=" .env 2>/dev/null | tail -1 | cut -d= -f2-; }
secao()    { echo; echo "== $*"; }

secao "Configuração (.env)"
if [[ ! -f .env ]]; then bloqueio ".env não existe (cp .env.example .env)"; else
  PERM=$(stat -c %a .env)
  [[ "$PERM" == "600" ]] && ok ".env com permissão 600" || atencao ".env com permissão $PERM (use chmod 600 .env)"
  for v in POSTGRES_PASSWORD REDIS_PASSWORD JWT_ACCESS_SECRET MFA_ENCRYPTION_KEY; do
    [[ -n "$(valor $v)" ]] && ok "$v definido" || bloqueio "$v vazio"
  done
  JWT=$(valor JWT_ACCESS_SECRET)
  (( ${#JWT} >= 32 )) && ok "JWT_ACCESS_SECRET com ${#JWT} caracteres" || bloqueio "JWT_ACCESS_SECRET curto"
fi

secao "HTTPS"
MODO=$(valor TLS_MODO); MODO=${MODO:-desligado}; TLS=$(valor TLS_ATIVO)
case "$MODO" in
  letsencrypt) ok "TLS_MODO=letsencrypt ($(valor TLS_DOMINIO))" ;;
  autoassinado) atencao "TLS_MODO=autoassinado — cifrado, mas o navegador alerta; use Let's Encrypt quando houver DNS" ;;
  *) bloqueio "HTTPS desligado (TLS_MODO=desligado) — senhas e respostas trafegam sem criptografia" ;;
esac
if [[ "$MODO" != "desligado" && "$TLS" != "true" ]]; then bloqueio "TLS_ATIVO deve ser true com HTTPS (cookies Secure/HSTS)"; fi
if [[ "$MODO" == "desligado" && "$TLS" == "true" ]]; then bloqueio "TLS_ATIVO=true sem HTTPS: o login não funcionará (cookie Secure em HTTP)"; fi
if [[ "$(valor HSTS_PRELOAD)" == "true" ]]; then
  atencao "HSTS_PRELOAD=true: só vale para domínio próprio registrável; confirme a inscrição em hstspreload.org (ADR-0055)"
fi
if docker compose logs nginx 2>/dev/null | grep -q "certificado não encontrado"; then
  atencao "Nginx caiu para HTTP por falta de certificado (ver logs do nginx)"
fi

secao "Serviços"
LOGS_CENTRAL=0; [[ "$(valor COMPOSE_FILE)" == *docker-compose.logs.yml* ]] && LOGS_CENTRAL=1
SERVICOS="nginx api postgres redis backup monitor"; [[ $LOGS_CENTRAL == 1 ]] && SERVICOS="$SERVICOS logs"
for s in $SERVICOS; do
  ESTADO=$(docker compose ps "$s" --format '{{.Status}}' 2>/dev/null)
  if [[ -z "$ESTADO" ]]; then bloqueio "$s não está rodando"
  elif [[ "$ESTADO" == *unhealthy* ]]; then bloqueio "$s: $ESTADO"
  elif [[ "$ESTADO" == *healthy* || "$s" == "backup" && "$ESTADO" == Up* ]]; then ok "$s: $ESTADO"
  else atencao "$s: $ESTADO"; fi
done
PUBLICADAS=$(docker compose ps --format '{{.Service}} {{.Ports}}' 2>/dev/null | grep -E -- '->' | grep -v '^nginx ' \
  | grep -vE '^logs 127\.0\.0\.1:[0-9]+->24224/tcp$' || true)
# O coletor de logs publica só em 127.0.0.1: quem conecta é o daemon do Docker (ADR-0054).
[[ -z "$PUBLICADAS" ]] && ok "Só o nginx publica portas para fora" || bloqueio "Outros serviços publicam portas: $PUBLICADAS"

secao "Contas"
SQL() { docker compose exec -T postgres psql -U quizzer -d quizzer -At -c "$1" 2>/dev/null; }
DEMO=$(SQL "SELECT count(*) FROM iam.usuarios WHERE email LIKE '%@quizzer.local' AND anonimizado_em IS NULL")
[[ "${DEMO:-0}" == "0" ]] && ok "Sem contas de demonstração (@quizzer.local)" || bloqueio "$DEMO conta(s) de demonstração (@quizzer.local) com senha conhecida — remova ou desative"
ADMINS=$(SQL "SELECT count(*) FROM iam.usuarios WHERE papel='ADMINISTRADOR' AND ativo")
[[ "${ADMINS:-0}" -ge 1 ]] && ok "$ADMINS administrador(es) ativo(s)" || bloqueio "Nenhum administrador ativo (use prisma/criar-admin.ts)"
[[ "${ADMINS:-0}" -ge 2 ]] || atencao "Recomendado ter 2 administradores (um atende o outro: reset de MFA, LGPD)"
SEMMFA=$(SQL "SELECT count(*) FROM iam.usuarios WHERE papel IN ('ADMINISTRADOR','COORDENADOR') AND ativo AND NOT mfa_habilitado AND ultimo_login_em IS NOT NULL")
[[ "${SEMMFA:-0}" == "0" ]] && ok "Perfis administrativos que já entraram têm MFA" || atencao "$SEMMFA perfil(is) administrativo(s) sem MFA"

secao "Backup"
STATUS=backups/.status.json
if [[ -f "$STATUS" ]]; then
  ULT=$(sed -n 's/.*"ultimoSucesso":"\([^"]*\)".*/\1/p' "$STATUS")
  if [[ -n "$ULT" ]] && (( $(date -u +%s) - $(date -u -d "$ULT" +%s) < 36*3600 )); then ok "Último backup: $ULT"; else bloqueio "Backup atrasado (último sucesso: ${ULT:-nunca})"; fi
else bloqueio "Nenhum backup registrado ainda"; fi
[[ -n "$(valor BACKUP_AGE_DESTINATARIO)" ]] && ok "Backups criptografados (age)" || bloqueio "Backups sem criptografia (configure BACKUP_AGE_DESTINATARIO)"
[[ -n "$(valor BACKUP_RCLONE_DESTINO)" ]] && ok "Cópia externa: $(valor BACKUP_RCLONE_DESTINO)" || bloqueio "Backups só neste servidor (configure BACKUP_RCLONE_DESTINO)"
if [[ -n "$(valor BACKUP_RCLONE_DESTINO)" ]]; then
  TESTE=$(sed -n 's/.*"ultimoTeste":"\([^"]*\)".*/\1/p' backups/.restauracao.json 2>/dev/null)
  if [[ -n "$TESTE" ]] && (( $(date -u +%s) - $(date -u -d "$TESTE" +%s) < 35*86400 )); then ok "Restauração da cópia externa testada em $TESTE"
  else atencao "Restauração da cópia externa não testada nos últimos 35 dias (infra/backup/testar-copia-externa.sh)"; fi
fi
[[ -n "$(valor BACKUP_WEBHOOK_FALHA)" ]] && ok "Alerta de falha de backup configurado" || bloqueio "Sem alerta de falha de backup (BACKUP_WEBHOOK_FALHA)"
if [[ -n "$(valor SMTP_HOST)" ]]; then
  [[ "$(valor APP_URL)" == https://* ]] && ok "E-mail ligado; links apontam para $(valor APP_URL)" || bloqueio "SMTP configurado mas APP_URL não é https:// (links dos e-mails ficariam errados)"
else
  atencao "E-mail desligado (SMTP_HOST vazio): sem 'esqueci minha senha' nem convites por e-mail"
fi
if [[ $LOGS_CENTRAL == 1 ]]; then
  [[ -n "$(valor LOGS_ENCAMINHAR_HTTP)$(valor LOGS_LOKI_URL)" ]] && ok "Logs centralizados e encaminhados para fora do VPS" \
    || atencao "Logs centralizados só neste servidor (LOGS_ENCAMINHAR_HTTP ou LOGS_LOKI_URL leva para fora)"
else
  atencao "Logs só no Docker deste servidor (opcional: docker-compose.logs.yml — ADR-0054)"
fi
[[ -n "$(valor MONITOR_WEBHOOK)$(valor BACKUP_WEBHOOK_FALHA)" ]] && ok "Monitor com webhook (API, 5xx, latência, Nginx, certificado, backup, disco)" \
  || bloqueio "Monitor sem webhook: alertas não chegam à equipe"

secao "Servidor (precisa de root para alguns itens)"
if command -v ufw >/dev/null; then
  ufw status 2>/dev/null | grep -q "Status: active" && ok "Firewall (ufw) ativo" || bloqueio "Firewall (ufw) inativo — rode infra/vps/provisionar.sh"
else bloqueio "ufw não instalado — rode infra/vps/provisionar.sh"; fi
if command -v sshd >/dev/null && [[ $EUID -eq 0 ]]; then
  SSHD=$(sshd -T 2>/dev/null)
  grep -qi '^passwordauthentication no' <<<"$SSHD" && ok "SSH sem senha (só chave)" || bloqueio "SSH aceita senha"
  grep -qi '^permitrootlogin no' <<<"$SSHD" && ok "SSH sem login de root" || atencao "SSH permite login de root"
else atencao "Não foi possível verificar o SSH (sshd ausente ou sem root)"; fi
if systemctl is-active --quiet fail2ban 2>/dev/null && fail2ban-client status sshd 2>/dev/null | grep -q 'Status for the jail: sshd'; then
  JAILS=$(fail2ban-client status 2>/dev/null | sed -n 's/.*Jail list:[[:space:]]*//p')
  grep -qw sshd <<<"$JAILS" && ok "fail2ban ativo com jail SSH" || bloqueio "fail2ban ativo, mas sem jail SSH"
else
  bloqueio "fail2ban inativo ou jail SSH indisponível"
fi

secao "Código e documentos"
grep -Eq '\[[^]]+\]' apps/web/src/paginas/Privacidade.tsx && bloqueio "Política de privacidade ainda contém campos provisórios entre colchetes — revisar todos com o DPO" || ok "Política de privacidade sem campos provisórios"

echo
echo "Resumo: $OK ok · $ATENCAO atenção · $BLOQUEIO bloqueio(s)"
(( BLOQUEIO == 0 ))
