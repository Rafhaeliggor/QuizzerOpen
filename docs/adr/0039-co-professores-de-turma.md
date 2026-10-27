# ADR-0039: Co-professores de turma

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A
- **Requisitos relacionados:** RF03 ("um ou mais professores responsáveis")

## Decisão

- Tabela `turmas.turma_professores` (sem FK para `iam` — ADR-0005). O `professorResponsavelId`
  continua sendo o **titular**.
- **Co-professor** vê a turma, matricula/remove alunos, importa CSV, aplica as **próprias** provas à
  turma e vê o relatório da turma e dos alunos dela.
- **Só o titular e a gestão** editam os dados da turma e definem a equipe
  (`PUT /turmas/:id/professores`, lista completa, auditado `TURMA_PROFESSORES_DEFINIDOS`). Corretor não
  entra na equipe.
- Para escolher a equipe, `GET /usuarios/professores` devolve só nome/e-mail de professores ativos
  (sem expor a administração de usuários).

## Consequências

- Provas e correções continuam do autor da prova (ADR-0021): o co-professor não corrige provas de
  outro professor só por compartilhar a turma.
