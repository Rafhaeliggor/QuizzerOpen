#!/usr/bin/env bash
# Provisionamento do VPS (Ubuntu 24.04+/26.04) — Sprint 1, Dev B.
#
# O QUE FAZ (idempotente):
#   1. Instala Docker + Compose, ufw, fail2ban e atualizações automáticas de segurança.
#   2. Cria o usuário não-root de deploy (padrão: quizzer) no grupo docker.
#   3. Firewall: nega entrada por padrão; libera SSH e a porta HTTP do Quizzer.
#   4. Hardening do SSH: sem login de root, sem senha (somente chave).
#
# USO (como root, em sessão SSH que você NÃO vai fechar até validar):
#   sudo DEPLOY_USER=quizzer HTTP_PORT=80 SSH_PORT=22 bash infra/vps/provisionar.sh
#
# SEGURANÇA: o passo 4 só é aplicado se o usuário de deploy já tiver uma chave
# em ~/.ssh/authorized_keys — evita trancar o servidor. Teste um novo login SSH
# com o usuário de deploy ANTES de encerrar a sessão atual.
#
# ATENÇÃO: portas publicadas pelo Docker ignoram as regras do ufw. Por isso, no
# docker-compose.yml apenas o Nginx publica porta; Postgres/Redis ficam em rede interna.
set -euo pipefail

DEPLOY_USER="${DEPLOY_USER:-quizzer}"
HTTP_PORT="${HTTP_PORT:-80}"
HTTPS_PORT="${HTTPS_PORT:-443}"
SSH_PORT="${SSH_PORT:-22}"

if [[ $EUID -ne 0 ]]; then
  echo "Execute como root (sudo)." >&2
  exit 1
fi

log() { printf '\n==> %s\n' "$*"; }

log "Pacotes base"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 ufw fail2ban unattended-upgrades ca-certificates curl
systemctl enable --now docker
dpkg-reconfigure -f noninteractive unattended-upgrades

log "Usuário de deploy: ${DEPLOY_USER}"
if ! id "${DEPLOY_USER}" &>/dev/null; then
  adduser --disabled-password --gecos "" "${DEPLOY_USER}"
fi
usermod -aG docker "${DEPLOY_USER}"
install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "/home/${DEPLOY_USER}/.ssh"

log "Firewall (ufw)"
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow "${HTTP_PORT}/tcp" comment 'Quizzer HTTP'
ufw allow "${HTTPS_PORT}/tcp" comment 'Quizzer HTTPS'
ufw --force enable

log "fail2ban (proteção SSH)"
install -d -m 755 /etc/fail2ban/jail.d
cat > /etc/fail2ban/jail.d/quizzer-sshd.local <<EOF
[sshd]
enabled = true
port = ${SSH_PORT}
backend = systemd
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban
fail2ban-client status sshd

log "Hardening do SSH"
CHAVES="/home/${DEPLOY_USER}/.ssh/authorized_keys"
if [[ -s "${CHAVES}" ]]; then
  cat > /etc/ssh/sshd_config.d/90-quizzer-hardening.conf <<EOF
Port ${SSH_PORT}
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
X11Forwarding no
AllowUsers ${DEPLOY_USER}
EOF
  sshd -t
  systemctl reload ssh
  echo "SSH endurecido. Teste agora: ssh -p ${SSH_PORT} ${DEPLOY_USER}@<IP> (sem fechar esta sessão)."
else
  echo "AVISO: ${CHAVES} vazio — hardening do SSH NÃO aplicado."
  echo "Adicione a chave pública do time nesse arquivo e execute o script novamente."
fi

log "Concluído"
echo "Próximos passos (como ${DEPLOY_USER}): clonar o repositório, cp .env.example .env, preencher segredos e"
echo "  docker compose up -d --build"
