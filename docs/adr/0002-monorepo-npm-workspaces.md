# ADR-0002: Monorepo com npm workspaces

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev B
- **Requisitos relacionados:** RNF01

## Contexto

O MVP tem um backend e um frontend (ver ADR-0003 e ADR-0009) mantidos por 3 pessoas, com
um único pipeline de CI. Repositórios separados aumentariam o custo de sincronização
(versões, PRs cruzados) sem benefício nesta fase.

## Decisão

Um único repositório com **npm workspaces** (npm 11, Node 24 LTS):

```
apps/api   → @quizzer/api  (NestJS)
apps/web   → @quizzer/web  (React)
infra/     → Nginx, Postgres (init), provisionamento do VPS
docs/      → requisitos, plano, ADRs, features
```

Um único `package-lock.json` na raiz. Scripts de conveniência na raiz
(`npm run dev:infra`, `dev:api`, `dev:web`, `lint`, `typecheck`, `test`, `test:e2e`, `build`).

## Alternativas consideradas

- **pnpm/Turborepo/Nx** — melhores para isolar dependências e cache de build, mas é mais
  uma ferramenta para a equipe aprender em 4 semanas. Reavaliar se o número de pacotes crescer.
- **Repositórios separados** — custo de coordenação maior.

## Consequências

- Setup simples (`npm ci` na raiz).
- `npm ci -w` não filtra o lockfile: a imagem Docker da API acaba recebendo dependências do
  workspace web e peers opcionais (~800 MB descompactada). Registrado como pendência em
  `docs/features/006-infraestrutura-e-deploy.md` (candidato: `pnpm deploy` ou bundle da API).
