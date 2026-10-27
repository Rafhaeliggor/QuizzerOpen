# ADR-0004: Prisma 7 como ORM e ferramenta de migrations

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A
- **Requisitos relacionados:** RNF02, RNF05 (segurança — sem SQL concatenado)

## Contexto

Precisamos de migrations versionadas, tipagem forte e, principalmente, de uma API que
torne difícil gerar SQL inseguro — o plano alerta que agentes de IA tendem a gerar
consultas por concatenação (Seção 3, item 4).

## Decisão

- **Prisma ORM 7.10** (última estável; a 8.0 ainda está em release candidate) com o
  gerador `prisma-client` (ESM) e o driver adapter **`@prisma/adapter-pg`** (`pg`).
- Client gerado em `apps/api/src/generated/prisma` (não versionado; gerado no build).
- Configuração em `apps/api/prisma.config.ts`; migrations em `apps/api/prisma/migrations`.
- Recurso `schemas` do datasource para um schema PostgreSQL por módulo (ADR-0005).
- SQL bruto só com as tagged templates do Prisma (`$queryRaw\`...\``), que parametrizam.
  `$queryRawUnsafe`/`$executeRawUnsafe` proibidos em código de produção (permitido apenas
  em utilitários de teste com SQL fixo).
- Migrations em produção aplicadas pelo serviço one-shot `migrate` do Compose
  (`prisma migrate deploy`) antes de a API subir.

## Alternativas consideradas

- **TypeORM** — padrão histórico do Nest, porém tipagem mais fraca e migrations mais frágeis.
- **Drizzle / Kysely** — boas opções, mas a equipe tem mais familiaridade com Prisma.

## Consequências

- Client tipado por modelo; erros de schema aparecem em tempo de compilação.
- O CLI do Prisma é dependência de desenvolvimento; o serviço `migrate` usa a imagem do
  estágio `build` (que contém o CLI), enquanto a imagem `runtime` da API não executa migrations.
