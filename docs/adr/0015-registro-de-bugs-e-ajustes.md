# ADR-0015: Registro de bugs corrigidos e ajustes de percurso

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Equipe
- **Complementa:** [ADR-0001](0001-registro-de-decisoes-e-features.md)

## Contexto

ADRs registram decisões e os documentos de feature registram funcionamento e pendências.
Faltava onde registrar (1) defeitos encontrados e corrigidos e (2) coisas não previstas que
precisaram ser criadas, removidas ou substituídas no caminho (arquivos de template,
dependências, configurações, ferramentas). Sem isso, o revisor não sabe por que um arquivo
sumiu ou por que uma dependência existe.

## Decisão

- [`docs/bugs-corrigidos.md`](../bugs-corrigidos.md): uma entrada `BUG-NNN` por defeito
  corrigido, com severidade, como foi encontrado, causa, correção, arquivos e teste de
  regressão. Bugs **abertos** continuam nas pendências da feature.
- [`docs/ajustes-de-percurso.md`](../ajustes-de-percurso.md): uma entrada `AJ-NNN` por item
  criado/removido/substituído/revertido, com o motivo.
- Códigos são sequenciais e nunca reutilizados; a tabela-resumo de cada arquivo é atualizada
  no mesmo PR da mudança.
- Se o ajuste for uma decisão de arquitetura, vira ADR e a entrada apenas aponta para ele.

## Consequências

- Rastreabilidade do "porquê" de mudanças pequenas que não justificam um ADR.
