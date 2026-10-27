# ADR-0012: Qualidade — Vitest, oxlint, CI no GitHub Actions e scripts de instalação

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev B
- **Requisitos relacionados:** plano, Seções 3 (itens 3 e 5) e 5 (Definição de Pronto)

## Decisão

- **Testes**: **Vitest 4** no backend e no frontend.
  - API — unitários em `src/**/*.spec.ts`; **e2e** em `test/**/*.e2e-spec.ts` sobem o
    `AppModule` completo contra **Postgres e Redis reais** (banco `quizzer_test`, migrations
    aplicadas no `globalSetup`). Nada de mock de banco nos e2e.
  - Web — Testing Library + jsdom em `src/**/*.test.tsx`.
  - Testes acompanham o código no mesmo PR (plano, Seção 3, item 3).
- **Lint**: **oxlint** (padrão dos templates atuais de Nest e Vite), com regras type-aware na
  API (`no-floating-promises`, `no-explicit-any` como erro). Web roda com `--deny-warnings`.
- **CI** (`.github/workflows/ci.yml`) a cada push/PR: `npm ci` → typecheck → lint → build →
  testes unitários; job separado de e2e com services Postgres/Redis; build das imagens Docker.
- **Scripts de instalação de dependências**: o npm 11 bloqueia `install`/`postinstall` por
  padrão. Apenas pacotes revisados ficam em `allowScripts` no `package.json` raiz
  (`argon2`, `prisma`, `@prisma/engines`, `esbuild`, com versão fixada). Pacote novo com script
  precisa de aprovação explícita (`npm install-scripts approve`) e revisão — mitigação de
  supply chain e de dependências "alucinadas" por IA.

## Consequências

- O CI é o filtro automático antes da revisão humana; tarefa que quebra o CI não está pronta.
- Atualizar `argon2`/`prisma` exige re-aprovar o script da nova versão.
- PENDENTE: cobertura mínima no CI, testes E2E de navegador (Playwright) no pipeline,
  `npm audit`/Dependabot.
