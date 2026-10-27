# syntax=docker/dockerfile:1
# Build a partir da RAIZ do repositório (workspaces npm):
#   docker build -f apps/api/Dockerfile .

FROM node:24-alpine AS base
WORKDIR /repo
# Ferramentas para compilar módulos nativos (argon2) caso não haja binário pré-compilado.
RUN apk add --no-cache python3 make g++

# ---- dependências completas (build) ----
FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w @quizzer/api --include-workspace-root

# ---- build (também usado pelo serviço one-shot de migrations/seed) ----
FROM deps AS build
COPY apps/api apps/api
RUN npm run build -w @quizzer/api
WORKDIR /repo/apps/api

# ---- somente dependências de produção ----
FROM base AS prod-deps
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# --omit=optional: o npm marca como "devOptional" o CLI do Prisma, TypeScript e afins
# (peers opcionais de @prisma/client); sem ele, entram na imagem final (~250 MB a mais).
# Resta ~10 MB de dependências do workspace web (npm ci não filtra workspaces).
RUN npm ci -w @quizzer/api --omit=dev --omit=optional --include-workspace-root && npm cache clean --force

# ---- imagem final ----
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
COPY --chown=node:node apps/api/package.json ./
# Pasta das mídias (volume "midias"): criada com o dono certo para o volume herdar.
RUN mkdir -p /app/dados/midias && chown -R node:node /app/dados
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/v1/health > /dev/null || exit 1
CMD ["node", "dist/main.js"]
