# 017 — HTTPS (TLS) e Nginx sem root

- **Status:** Concluída com pendências
- **Sprint:** 6 (uso real) · **Responsável:** Dev B
- **Requisitos:** RNF05 · **ADRs:** [0029](../adr/0029-https-e-nginx-sem-root.md), [0008](../adr/0008-infraestrutura-docker-vps.md)

## Como funciona

O container `nginx` lê `TLS_MODO` ao iniciar e monta a configuração:

| `TLS_MODO` | O que acontece |
|---|---|
| `desligado` (padrão) | Site em HTTP na `HTTP_PORT`. Também responde ao desafio do Let's Encrypt. |
| `autoassinado` | HTTP redireciona para HTTPS (`HTTPS_PORT`) com certificado gerado localmente. O navegador alerta, mas o tráfego é cifrado. |
| `letsencrypt` | HTTPS com certificado válido para `TLS_DOMINIO`, renovado automaticamente pelo serviço `certbot`. |

Em HTTPS: TLS 1.2 e 1.3 (versões antigas recusadas), HTTP/2, HSTS por 1 ano, cookies `Secure`.
Se o certificado esperado não existir, o site **continua no ar em HTTP** e o log avisa
(`[tls] AVISO: certificado não encontrado`). Um `TLS_MODO` inválido impede o container de subir.

O Nginx roda como usuário sem privilégios (uid 101).

## Como usar

```bash
# Sem domínio (acesso por IP), já cifrado:
infra/tls/gerar-autoassinado.sh 203.0.113.10

# Com domínio apontando para o VPS e portas 80/443 liberadas:
infra/tls/ativar-letsencrypt.sh provas.instituicao.edu.br ti@instituicao.edu.br --staging   # ensaio
infra/tls/ativar-letsencrypt.sh provas.instituicao.edu.br ti@instituicao.edu.br             # valendo

# Sem domínio próprio, certificado válido pelo sslip.io (ADR-0056); conta ACME sem e-mail:
infra/tls/ativar-letsencrypt.sh 203-0-113-10.sslip.io --sem-email

# Voltar para HTTP (manutenção):
infra/tls/desativar-tls.sh
```

Os scripts ajustam o `.env` (`TLS_MODO`, `TLS_DOMINIO`, `TLS_ATIVO`, `COMPOSE_PROFILES`) e recriam `nginx` e `api`.

| Variável | Padrão | |
|---|---|---|
| `HTTP_PORT` / `HTTPS_PORT` | 80 / 443 | Portas publicadas no host (podem ser `IP:porta`) |
| `PORTA_HTTPS_PUBLICA` | 443 | Porta usada no redirecionamento HTTP→HTTPS |
| `TLS_MODO`, `TLS_DOMINIO` | `desligado`, vazio | |
| `TLS_ATIVO` | false | Cookies `Secure` + HSTS na API — `true` sempre que houver HTTPS |

## Testes

- Manual/automatizado nesta máquina: modo HTTP; autoassinado (301 para HTTPS, HSTS só em HTTPS,
  cookie `Secure`, TLS 1.1 recusado, 1.2/1.3 aceitos); fallback sem certificado; modo inválido.
- Suíte Playwright completa sobre HTTPS (`E2E_BASE_URL=https://… E2E_IGNORAR_CERTIFICADO=true`).

## Pendências

- [x] ~~Emitir um certificado Let's Encrypt real~~ — homologação em `https://203-0-113-10.sslip.io` desde 2026-10-20 (ADR-0056). A primeira emissão revelou o [BUG-026](../bugs-corrigidos.md#bug-026) (permissões), já corrigido; a renovação foi simulada com sucesso (`certbot renew --dry-run`).
- [ ] Emitir para o domínio definitivo da instituição em produção (mesmo script).
- [x] ~~Avaliar HSTS `preload`~~ — decidido no [ADR-0055](../adr/0055-hsts-preload.md): desligado por padrão (num subdomínio da instituição não se aplica); `HSTS_PRELOAD=true` para domínio próprio.
- [x] ~~Monitorar validade do certificado~~ — monitor interno (`checar_certificado`, lote 6 — [026](026-monitoramento-e-manutencao.md)) e uptime externo (`uptime.yml`, lote 7), ambos com alerta abaixo de 14 dias.
- [x] Homologação pública em HTTPS desde 2026-10-20. Primeiro com certificado autoassinado, depois com Let's Encrypt em `203-0-113-10.sslip.io`, nas portas 80/443. O HTTP redireciona sempre para o domínio do certificado. A bateria de testes segue o modo ativo (`URL_APP` em `testes/lib.sh`).

## Arquivos

`apps/web/Dockerfile`, `infra/nginx/{modelos,entrypoint,snippets-app.conf,seguranca.conf}`, `infra/tls/*`, serviço `certbot` no `docker-compose.yml`.
