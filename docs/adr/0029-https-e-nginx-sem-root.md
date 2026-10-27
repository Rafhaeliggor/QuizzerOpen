# ADR-0029: HTTPS em três modos e Nginx sem root

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF05 (criptografia em trânsito); plano (Seções 1 e 6 — TLS quando houver DNS)
- **Complementa:** [ADR-0008](0008-infraestrutura-docker-vps.md)

## Decisão

- Imagem do frontend baseada em **`nginxinc/nginx-unprivileged`** (uid 101), escutando
  **8080 (HTTP) e 8443 (HTTPS)** no container; o Compose mapeia `HTTP_PORT`/`HTTPS_PORT`.
- `TLS_MODO` escolhe o modelo do Nginx na inicialização (`infra/nginx/entrypoint/15-modo-tls.envsh`):

| Modo | Uso | Como ativar |
|---|---|---|
| `desligado` | HTTP por IP (homologação/sem DNS) | `infra/tls/desativar-tls.sh` |
| `autoassinado` | HTTPS já, sem domínio (navegador alerta) | `infra/tls/gerar-autoassinado.sh <IP>` |
| `letsencrypt` | Produção com domínio | `infra/tls/ativar-letsencrypt.sh <dominio> <email>` |

- HTTPS: TLS 1.2/1.3, HTTP/2, HSTS (sem preload) **apenas em HTTPS** via `map $scheme`
  dentro do snippet de segurança (um `add_header` em `location` anula o do `server`);
  HTTP redireciona para HTTPS, exceto `/healthz` e o desafio ACME.
- Let's Encrypt por **webroot**: o modelo HTTP já serve `/.well-known/acme-challenge/`, então o
  primeiro certificado é emitido sem parar o site. Renovação pelo serviço `certbot` (perfil
  `letsencrypt`, a cada 12 h); o Nginx recarrega a cada 12 h.
- **Falha segura:** certificado configurado mas ausente → sobe em HTTP com aviso no log (o site
  não cai); `TLS_MODO` inválido → container não sobe (erro de configuração visível).
- Os scripts mantêm `TLS_ATIVO=true` na API em sincronia (cookies `Secure` + HSTS do Helmet).

## Consequências

- Validado: modo HTTP, autoassinado (redirecionamento, HSTS, cookie Secure, TLS 1.1 recusado),
  fallback e suíte Playwright sobre HTTPS. **Emissão real do Let's Encrypt não testada** (sem DNS).
