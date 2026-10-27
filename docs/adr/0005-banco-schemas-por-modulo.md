# ADR-0005: PostgreSQL com um schema por módulo e sem FK entre schemas

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A
- **Requisitos relacionados:** RNF02, Seção 7.5 (Diagrama ER), Seção 5 (Inventário de Dados)

## Contexto

O RNF02 exige "schemas lógicos separados por módulo de domínio, sem chaves estrangeiras
cruzando schemas — garantindo que a modularidade arquitetural também exista no nível de dados".

## Decisão

- **PostgreSQL 18** (imagem oficial `postgres:18-alpine`).
- Schemas criados na Sprint 1: `iam`, `turmas`, `questoes`, `provas`, `aplicacao`, `correcao`.
  Os demais (`recursos`, `auditoria`, `notificacoes`) entram quando o módulo for implementado.
- **FKs apenas dentro do mesmo schema.** Referência a outro módulo é uma coluna `uuid`
  comentada no `schema.prisma` ("Referência a X (sem FK — outro schema)"), sem `@relation`.
  A integridade é responsabilidade do serviço do módulo dono.
- **Chaves primárias UUID v7** (`@default(uuid(7))`): ordenáveis por tempo, boas para índice.
- Tabelas e colunas em **snake_case em português**, como no Diagrama ER; modelos Prisma em
  PascalCase e campos em camelCase com `@map`.
- Timestamps sempre `timestamptz(3)`.
- Ajustes em relação ao Diagrama ER, decididos na modelagem inicial:
  - `iam.usuarios` ganhou `matricula` (login do aluno por matrícula — RF01), `trocar_senha`
    (primeiro acesso — RF02), `ativo`, contador de falhas/bloqueio (exceção do RF01) e campos
    do MFA (`mfa_segredo_cifrado`, `mfa_ultimo_passo`).
  - Nova tabela `iam.sessoes` (refresh tokens — ADR-0006).
  - `questoes.topicos` criada (o ER referencia `topico_id`, hierárquico).
  - `versoes_questao.alternativas` (jsonb) adicionada para questões fechadas.
  - `provas.provas` ganhou `status`, `modo_navegacao`, `ordem_questoes` (Tabela 3) e
    `tempo_limite_min`; `prova_questoes` liga direto à prova (com `ordem`), pois **seções e
    versões antifraude estão fora do MVP** (plano, Seção 6). `secoes` e `versoes_prova` não
    foram criadas.
  - `aplicacao.aplicacoes` guarda `pin_acesso_hash` (nunca o PIN em claro) e `pin_expira_em`.
  - `aplicacao.tentativas` ganhou `numero` e `prazo_em` (prazo calculado no servidor — RNF03).
  - `aplicacao.respostas` tem unicidade `(tentativa_id, versao_questao_id)` para autosave por upsert.
  - `correcao.notas` ganhou `status` (`PENDENTE_CORRECAO_MANUAL`/`CONSOLIDADA`) e
    `nota_provisoria` (RF07).

## Consequências

- Exclusões em cascata entre módulos não existem; remoções são lógicas (ex.: matrícula usa
  `data_desvinculo`, preservando histórico — exceção do RF03).
- Consultas de relatório que cruzam módulos serão feitas por composição em serviço ou por
  views de leitura dedicadas (decidir na Sprint 4 em novo ADR).
