# syntax=docker/dockerfile:1
# Build a partir da RAIZ do repositório (workspaces npm):
#   docker build -f apps/web/Dockerfile .
# A imagem final é o Nginx (sem root) que serve o SPA, faz proxy reverso de /api e,
# conforme TLS_MODO, termina o HTTPS (ver docs/adr/0029-https-e-nginx-sem-root.md).

FROM node:24-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w @quizzer/web --include-workspace-root
COPY apps/web apps/web
# Personalização em tempo de build (Vite embute no bundle) — ver ADR-0053.
ARG VITE_NOME_INSTITUICAO=Unima
ARG VITE_URL_AJUDA=
ARG VITE_CONTATO_ENCARREGADO=
ENV VITE_NOME_INSTITUICAO=$VITE_NOME_INSTITUICAO VITE_URL_AJUDA=$VITE_URL_AJUDA VITE_CONTATO_ENCARREGADO=$VITE_CONTATO_ENCARREGADO
RUN npm run build -w @quizzer/web

FROM nginxinc/nginx-unprivileged:1.31-alpine AS runtime
USER root
# Remove o site padrão da imagem; o nosso é gerado a partir de /etc/nginx/modelos.
RUN rm -f /etc/nginx/conf.d/default.conf \
 && mkdir -p /etc/nginx/templates /etc/nginx/certs /etc/letsencrypt /var/www/acme \
 && chown -R nginx:nginx /etc/nginx/templates /etc/nginx/conf.d /var/www/acme
COPY infra/nginx/modelos/ /etc/nginx/modelos/
COPY infra/nginx/seguranca.conf /etc/nginx/snippets/seguranca.conf
COPY infra/nginx/proxy-api.conf /etc/nginx/snippets/proxy-api.conf
COPY infra/nginx/snippets-app.conf /etc/nginx/snippets/app.conf
COPY --chmod=755 infra/nginx/entrypoint/ /docker-entrypoint.d/
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080 8443
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz > /dev/null || exit 1
