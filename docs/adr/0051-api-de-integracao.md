# ADR-0051: API de integração com sistemas acadêmicos (chaves por escopo)

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A
- **Requisitos relacionados:** RNF01 ("integração com LMS/ERP")

## Decisão

- **Chaves de integração** (`iam.chaves_integracao`) criadas pelo Administrador: token
  `qz_<prefixo>_<segredo>` (prefixo público de 48 bits identifica a chave; segredo de 256 bits,
  guardado só como SHA-256, comparação em tempo constante), mostrado **uma vez**; escopos, validade
  opcional, revogação imediata, "último uso" registrado.
- **Escopos:** `notas:ler`, `turmas:ler`, `turmas:escrever`.
- **Rotas** (`/api/v1/integracao/v1`, guard próprio — JWT de usuário não serve):
  - `GET notas?desde&provaId&turma&cursor&limite` — resultados **consolidados** de alunos com conta,
    paginados por cursor estável (`consolidadaEm`, `id`), com e-mail, matrícula e código da turma;
  - `GET turmas` — turmas com código externo, professor e matrículas ativas;
  - `PUT turmas/:codigo` — cria/atualiza a turma pelo **código externo** (novo campo
    `turmas.codigo_externo`) e sincroniza matrículas (cria contas com convite; `removerAusentes`
    desvincula quem saiu, preservando histórico). Auditado com o prefixo da chave.
- Ações feitas pela integração usam como autor quem criou a chave (rastreabilidade).

## Consequências

- Sem webhooks de saída (o sistema acadêmico consulta por `desde`/cursor).
- Guia para a TI da instituição: `docs/operacao/integracao.md`.
