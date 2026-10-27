# ADR-0008: Infraestrutura — Docker Compose no VPS, Nginx único, acesso HTTP por IP

- **Status:** Aceito — HTTPS e Nginx sem root detalhados no [ADR-0029](0029-https-e-nginx-sem-root.md)
- **Data:** 2026-10-10
- **Responsável:** Dev B
- **Requisitos relacionados:** Seção 7.4 (Diagrama de Containers), RNF05, plano (Seções 1 e 6)

## Contexto

VPS já provisionada, **sem DNS**: acesso via IP público + porta, HTTP. RabbitMQ e MinIO
foram adiados. O diagrama de containers prevê redes `frontend-net`, `backend-net`, `data-net`.

## Decisão

- **Docker Compose** (`docker-compose.yml`) com os serviços:
  - `nginx` — imagem própria (`apps/web/Dockerfile`): serve o build estático do SPA **e** faz
    proxy reverso de `/api/` para a API. Único serviço que publica porta (`HTTP_PORT`, padrão 80).
  - `api` — NestJS (`apps/api/Dockerfile`, estágio `runtime`): usuário `node`, sistema de
    arquivos `read_only`, `no-new-privileges`, healthcheck em `/api/v1/health`.
  - `migrate` — one-shot (`prisma migrate deploy`) que precisa terminar com sucesso antes da API.
  - `postgres` (18-alpine) e `redis` (8-alpine, com senha e AOF) com volumes nomeados
    `pg_data` e `redis_data`.
- **Redes**: `frontend-net` (nginx), `backend-net` interna (nginx↔api), `data-net` interna
  (api↔postgres/redis). Postgres e Redis nunca publicam porta.
- **Acesso HTTP por IP** nesta fase. A variável `TLS_ATIVO=false` desliga cookies `Secure`,
  HSTS e `upgrade-insecure-requests` (que quebrariam o acesso por HTTP).
- **Preparação para TLS** (quando houver DNS): adicionar `server :443` no Nginx com
  certificado Let's Encrypt (certbot/webroot ou container dedicado), redirecionar 80→443,
  liberar 443 no ufw e mudar `TLS_ATIVO=true`. Não é bloqueante para o MVP.
- **Logs**: driver `json-file` com rotação (10 MB × 5 arquivos por container).
- **Provisionamento do VPS**: `infra/vps/provisionar.sh` (Docker, usuário não-root `quizzer`
  no grupo docker, ufw, fail2ban, unattended-upgrades, SSH só por chave e sem root).
  O hardening do SSH só é aplicado se o usuário de deploy já tiver chave autorizada.
- **Desenvolvimento local**: `docker-compose.dev.yml` sobe só Postgres/Redis em `127.0.0.1`;
  API e web rodam no host com hot reload (Vite faz proxy de `/api`).

## Alternativas consideradas

- **Traefik** — TLS automático é atraente, mas sem DNS não há ganho agora; Nginx é mais conhecido.
- **Dois containers de frontend + proxy separado** — o MVP tem um SPA só (ADR-0009).

## Consequências

- Portas publicadas pelo Docker **ignoram o ufw**: por isso só o Nginx publica porta.
- Confirmar com o provedor que o IP do VPS é fixo (risco do plano, Seção 7).
- PENDENTE (Sprint 2): backup automatizado do volume Postgres. PENDENTE (Sprint 3):
  logs centralizados e verificação de uptime. PENDENTE: CD (deploy automático) — hoje o
  deploy é `git pull && docker compose up -d --build` no VPS.
