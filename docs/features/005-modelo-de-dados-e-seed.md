# 005 — Modelo de dados inicial e seed

- **Status:** Concluída (MVP)
- **Sprint:** 1 · **Responsável:** Dev A
- **Requisitos:** RNF02, Seção 5 (Inventário de Dados), Seção 7.5 (Diagrama ER)
- **ADRs:** [0004](../adr/0004-orm-prisma.md), [0005](../adr/0005-banco-schemas-por-modulo.md)

## Objetivo

Criar o schema inicial (Usuário, Turma, Questão, Prova, Aplicação, Tentativa, Nota) com
migrations versionadas e dados de teste para desenvolvimento e demonstração.

## Schemas e tabelas

| Schema | Tabelas | Usado a partir de |
|---|---|---|
| `iam` | `usuarios`, `sessoes`, `permissoes_delegadas` | Sprint 1 |
| `turmas` | `turmas`, `matriculas`, `turma_professores` (lote 6) | Sprint 2 |
| `questoes` | `topicos`, `questoes`, `versoes_questao`, `midias` | Sprint 2 |
| `provas` | `provas`, `prova_questoes` | Sprint 2 |
| `aplicacao` | `aplicacoes`, `instancias`, `tentativas`, `respostas`, `eventos_tentativa` (lote 6) | Sprint 3 |
| `correcao` | `notas`, `correcoes_questao`, `anulacoes` | Sprint 3 |
| `recursos` | `recursos` | Sprint 4 |
| `notificacoes` | `notificacoes` | Sprint 4 |
| `auditoria` | `eventos` (somente inserção — trigger) | Sprint 4 |

Migration `20261010180000_sprints_2_a_4` revisou o modelo inicial (ver [ADR-0016](../adr/0016-simplificacoes-de-dominio-no-mvp.md)):
`topicos` removida (tópico em texto), PIN em texto como código de sala, instância única por
participante (`participante_chave`), `prazo_em` obrigatório, snapshot de correção por questão.

Migration `20261011150000_formatos_midia_politicas` (lote 6): `questoes.formato`/`alto_risco`,
`versoes_questao.pendente`, `midias` refeita (upload em duas etapas — ADR-0032),
`provas.exige_mfa`/`exibir_gabarito`/`prazo_recurso_dias`, `tentativas.saidas_de_foco`,
`eventos_tentativa`, `turma_professores`, snapshot de nota com política de gabarito/prazo e de
questão com `formato`/`disciplina` (backfill `DISSERTATIVA` nas abertas).

Regras: FK só dentro do schema; referências entre módulos são colunas `uuid` sem FK
(comentadas no `schema.prisma`); PK UUID v7; `timestamptz(3)`. Os desvios em relação ao
Diagrama ER estão listados no ADR-0005.

As tabelas das Sprints 2–3 são uma **primeira versão**: cada módulo deve revisar seu modelo
ao ser implementado (nova migration), especialmente após a leitura das RNs numeradas.

## Comandos

```bash
npm run db:migrate -w @quizzer/api -- --name <nome>   # nova migration (dev)
npm run db:deploy  -w @quizzer/api                    # aplica migrations (CI/produção)
npm run db:seed    -w @quizzer/api                    # seed (exige SEED_SENHA_PADRAO)
```

No Docker: o serviço `migrate` aplica as migrations automaticamente; seed manual com
`docker compose run --rm -e SEED_SENHA_PADRAO=... -e SEED_PERMITIR_PRODUCAO=true migrate npx prisma db seed`
(**só em homologação**).

## Seed (idempotente)

| Usuário | Papel | Login |
|---|---|---|
| Administrador Quizzer | ADMINISTRADOR | `admin@quizzer.local` (MFA cadastrado no 1º login) |
| Ana Souza | PROFESSOR | `professor@quizzer.local` (autora das questões e provas) |
| Carlos Mendes | PROFESSOR | `revisor@quizzer.local` (para a dupla checagem) |
| Diana Rocha | CORRETOR | `corretor@quizzer.local` |
| Bruno Lima | ALUNO | `aluno@quizzer.local` ou matrícula `2026000001` |
| Camila Torres | ALUNO | `aluno2@quizzer.local` ou matrícula `2026000002` |

Também cria: "Turma Piloto 2026.2" (professora Ana, 2 alunos), 7 questões publicadas
(Biologia e Conhecimentos Gerais), a prova **"Avaliação Diagnóstica de Biologia"** aplicada à
turma por 7 dias e o **"Quiz de Conhecimentos Gerais"** público com PIN (impresso no final do
seed). Desde o lote 6, também 3 questões nos novos formatos (V/F e resposta curta) e a prova
**"Mini quiz: verdadeiro/falso e resposta curta"** (gabarito após o resultado, recurso em 7 dias)
aplicada à turma. Rodar de novo após 7 dias cria novas aplicações.
Senha de todos: valor de `SEED_SENHA_PADRAO`. Bloqueado em `NODE_ENV=production` sem `SEED_PERMITIR_PRODUCAO=true`.

## Testes

- O banco de teste `quizzer_test` recebe as migrations no `globalSetup` dos e2e (valida que aplicam do zero).
- Seed executado duas vezes seguidas sem erro/duplicação (verificado manualmente).

## Pendências e limitações

- [x] ~~Seções e versões antifraude~~ — composição por seções e sorteio por participante, lote 8 ([032](032-secoes-e-sorteio.md)).
- [x] ~~Turma com mais de um professor~~ — co-professores, lote 6 ([022](022-delegacao-e-co-professores.md)).
- [x] ~~Unicidade de matrícula ativa por (turma, aluno)~~ — índice único parcial `matriculas_ativa_turma_aluno_key` (migration `20261024120000`, aplicada na homologação em 2026-10-26); aviso no `schema.prisma` para o `migrate dev` não removê-lo.
- [ ] Criptografia em repouso do volume do Postgres (RNF05) — depende do disco do VPS (avaliar LUKS/provedor).
- [x] ~~Backup automatizado~~ — [016](016-operacao-backup-e-carga.md), [018](018-backup-externo.md).

## Arquivos principais

- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`, `apps/api/prisma/seed.ts`, `apps/api/prisma.config.ts`
