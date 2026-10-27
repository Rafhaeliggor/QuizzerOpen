# ADR-0003: Backend NestJS 12 como monólito modular

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A / Dev B
- **Requisitos relacionados:** Seção 7 do Documento de Requisitos, RNF01, RNF02

## Contexto

O Documento de Requisitos propõe um **monólito modular** com fronteiras de domínio bem
definidas, permitindo extrair módulos no futuro. O plano de 4 semanas simplifica: um único
backend NestJS, sem separar `api-gateway` de `api-core`.

## Decisão

- **NestJS 12** (última major estável), **Node.js 24 LTS**, **TypeScript 6.0** (versão
  fixada pelo Nest CLI 12), módulos **ESM** (`"type": "module"`, imports com `.js`).
- Um módulo Nest por módulo de domínio em `apps/api/src/modules/<modulo>`:
  `iam`, `usuarios`, `health` (Sprint 1); `turmas`, `questoes`, `provas`, `aplicacao`,
  `correcao`, `recursos`, `relatorios`, `notificacoes`, `auditoria` nas próximas sprints.
- Código transversal em `src/common` (auth, cripto, throttle) e infraestrutura em
  `src/infra` (Prisma, Redis).
- Regra de fronteira: um módulo **não acessa tabelas de outro módulo** diretamente; usa o
  serviço exportado pelo módulo dono (espelha a regra de dados do ADR-0005).
- API REST sob `/api/v1` (ver ADR-0013).

## Alternativas consideradas

- **Microsserviços / gateway separado** — fora de escopo no MVP (plano, Seção 6).
- **Fastify em vez de Express** — ganho de performance irrelevante no volume do MVP;
  Express é o padrão do Nest e o que a equipe conhece.
- **TypeScript 7 (compilador nativo)** — ainda não suportado pelo Nest CLI 12.

## Consequências

- Extração futura de módulos é viável se a regra de fronteira for respeitada.
- RabbitMQ/worker do diagrama de containers ficam fora do MVP: processamento síncrono.
