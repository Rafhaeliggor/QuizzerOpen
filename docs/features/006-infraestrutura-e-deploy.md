# 006 — Infraestrutura, deploy, CI e observabilidade básica

- **Status:** Concluída com pendências
- **Sprint:** 1 · **Responsável:** Dev B
- **Requisitos:** Seção 7.4 (containers), RNF05; plano Dev B Sprint 1
- **ADRs:** [0008](../adr/0008-infraestrutura-docker-vps.md), [0010](../adr/0010-configuracao-e-segredos.md), [0012](../adr/0012-qualidade-testes-e-ci.md), [0014](../adr/0014-logging-estruturado.md)

## Objetivo

Ambiente reproduzível (dev e VPS), pipeline de CI e sinais mínimos de saúde/observabilidade.

## Topologia (produção/homologação)

```
Internet ──► nginx :HTTP_PORT/:HTTPS_PORT (container 8080/8443, sem root) ──(backend-net, interna)──► api :3000 ──(data-net, interna)──► postgres / redis
             (SPA + /api proxy)                            ▲
                                                           └── migrate (one-shot: prisma migrate deploy)
```

## Como usar

**Desenvolvimento**

```bash
npm ci
cp apps/api/.env.example apps/api/.env      # preencha os segredos
npm run dev:infra                            # Postgres + Redis em 127.0.0.1
npm run db:deploy -w @quizzer/api && npm run db:seed -w @quizzer/api
npm run dev:api                              # http://localhost:3000/api/v1/health
npm run dev:web                              # http://localhost:5173 (proxy de /api)
```

**VPS**

```bash
sudo DEPLOY_USER=quizzer HTTP_PORT=80 bash infra/vps/provisionar.sh   # uma vez (revisar antes!)
cp .env.example .env && chmod 600 .env                                  # preencher segredos
docker compose up -d --build
curl http://<IP>/api/v1/health
```

## Health-check

`GET /api/v1/health` (público, sem rate limit) → `200 {status:'ok', info:{database, redis}}`
ou `503` com o componente em `down`. Usado pelo healthcheck do container da API; o Nginx tem
`/healthz` próprio.

## Segurança aplicada

- Só o Nginx publica porta; Postgres/Redis em rede interna; Redis com senha.
- API: usuário não-root, filesystem somente leitura, `no-new-privileges`.
- Nginx: CSP restritiva, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`,
  `server_tokens off`, rate limit de flood em login/MFA; repassa o IP real substituindo `X-Forwarded-For`.
- API: Helmet (HSTS/upgrade-insecure só com `TLS_ATIVO=true`), `x-powered-by` desligado.
- Scripts de instalação npm apenas para pacotes aprovados (`allowScripts`).
- Revisão dos Dockerfiles: nenhum segredo em imagem (`.dockerignore` exclui `.env`); segredos só via ambiente.

## CI (`.github/workflows/ci.yml`)

1. `qualidade`: `npm ci` → typecheck API/Web → lint → build → testes unitários.
2. `e2e-api`: Postgres 18 + Redis 8 como services → testes e2e.
3. `docker`: build das imagens API e Web (sem push).

Pipeline simulado localmente numa cópia limpa do repositório: tudo verde
(21 testes unitários API, 20 web, 17 e2e).

## Pendências e limitações

- [ ] **Executar `provisionar.sh` no VPS real** e confirmar que o IP é fixo — roteiro em [operacao/implantacao.md](../operacao/implantacao.md); verificação com `infra/vps/verificar-producao.sh`.
- [x] ~~Publicar o repositório no GitHub~~ — remoto `origin` no GitHub com os commits da `main` enviados; o Dependabot já abre PRs. Conferir o resultado do CI na aba *Actions*.
- [x] Deploy pelo GitHub Actions, manual e com CI verde (`deploy.yml`) — lote 7, [031](031-relatorios-excel-e-indicios.md).
- [x] ~~TLS~~ — três modos prontos ([feature 017](017-https.md)); emissão real do Let's Encrypt aguarda DNS.
- [x] ~~Backup automatizado e teste de restauração~~ — [feature 016](016-operacao-backup-e-carga.md).
- [x] Monitor de disponibilidade com alerta por webhook — lote 6, [026](026-monitoramento-e-manutencao.md).
- [x] Monitor externo ao VPS — `uptime.yml`, lote 7 ([031](031-relatorios-excel-e-indicios.md)); ligar com `URL_PRODUCAO`.
- [x] Logs centralizados (opcional, `docker-compose.logs.yml`) — lote 9, [038](038-metricas-logs-e-teste-de-restauracao.md).
- [x] ~~Imagem da API ~800 MB~~ — 462 MB com `--omit=optional` ([ADR-0026](../adr/0026-testes-de-navegador-carga-e-supply-chain.md)).
- [x] ~~Teste de carga~~ — [feature 016](016-operacao-backup-e-carga.md); roda no CI (job `navegador`).

## Arquivos principais

- `docker-compose.yml`, `docker-compose.dev.yml`, `.env.example`, `apps/api/.env.example`
- `apps/api/Dockerfile`, `apps/web/Dockerfile`, `infra/nginx/*`, `infra/postgres/init-test-db.sql`, `infra/vps/provisionar.sh`
- `.github/workflows/ci.yml`, `apps/api/src/modules/health/*`
