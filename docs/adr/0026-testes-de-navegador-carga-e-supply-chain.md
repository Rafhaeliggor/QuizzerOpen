# ADR-0026: Testes de navegador e de carga no CI; endurecimento de dependências

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev B / Dev C
- **Requisitos relacionados:** plano, Seções 3 e 5; Dev B/Dev C Sprint 4
- **Complementa:** [ADR-0012](0012-qualidade-testes-e-ci.md)

## Decisão

**Testes**
- **Playwright** (`apps/web/e2e`, versão fixa 1.64.0) cobre o ciclo completo no navegador
  (inclui sessão única e prova pública) **contra a stack Docker real** já semeada. Não mocka a API.
- **Teste de carga** sem dependências (`testes/carga/turma-simultanea.mjs`): N alunos de uma
  turma, mesmo IP, fazendo login → troca de senha → prova completa → envio em paralelo.
- Novo job de CI `navegador`: sobe o Compose com segredos efêmeros, aplica o seed, roda
  Playwright e o teste de carga com 40 alunos (falha se algum aluno falhar).

**Dependências (supply chain)**
- Imagem da API instala com `--omit=dev --omit=optional`: o npm marcava o CLI do Prisma,
  TypeScript e afins como "devOptional" e os levava para produção. Imagem **818 → 462 MB**, e
  as 4 vulnerabilidades altas do `npm audit` (todas na árvore do CLI do Prisma) **saíram do runtime**.
- `overrides` no `package.json` raiz: `mysql2 ^3.24.5` e `deepmerge-ts ^8.0.2` corrigem as
  vulnerabilidades também no container de migrations e em desenvolvimento → `npm audit`: 0.
  Validado: `prisma validate/migrate/generate/db seed` e todas as suítes.

## Consequências

- Remover os overrides quando o Prisma publicar versão estável com as dependências corrigidas.
- PENDENTE: Dependabot/`npm audit` agendado no CI.
