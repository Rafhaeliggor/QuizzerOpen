# ADR-0019: Comunicação entre módulos por serviços exportados

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Equipe
- **Requisitos relacionados:** RNF02, Seção 7 (monólito modular)
- **Complementa:** [ADR-0003](0003-backend-nestjs-monolito-modular.md), [ADR-0005](0005-banco-schemas-por-modulo.md)

## Decisão

- Cada módulo só acessa as **próprias tabelas** pelo Prisma. Dados de outro módulo vêm de
  métodos do serviço exportado pelo dono (ex.: `TurmasService.alunoMatriculado`,
  `ProvasService.paraAplicacao`, `CorrecaoService.notasParaRelatorio`).
- Grafo de dependências (sem ciclos):

```
iam ─► auditoria, notificacoes            (globais)
usuarios ─► iam
questoes ─► usuarios
turmas ─► usuarios
provas ─► questoes, usuarios
correcao ─► provas
recursos ─► correcao, provas
aplicacao ─► provas, turmas, usuarios, correcao, recursos
relatorios ─► correcao, provas, turmas
```

- Quando uma operação precisa ser atômica entre módulos (finalizar tentativa + criar nota;
  decidir recurso + recalcular notas), o módulo orquestrador abre a transação e passa o
  `Prisma.TransactionClient` para o método do outro módulo.
- **Relatórios** não têm tabelas: agregam dados fornecidos pela correção (read model).
- Durante a implementação duas violações foram encontradas e corrigidas (correção lendo
  recursos; recursos lendo anulações) — registradas em `docs/ajustes-de-percurso.md`.

## Consequências

- Extrair um módulo como serviço continua viável. Revisões de código devem rejeitar
  `this.prisma.<tabela de outro módulo>`.
