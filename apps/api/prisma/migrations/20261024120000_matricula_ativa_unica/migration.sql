-- Preserva o vínculo ativo mais recente e encerra duplicatas legadas sem apagar histórico.
WITH duplicadas AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY turma_id, aluno_id
           ORDER BY data_vinculo DESC, id DESC
         ) AS posicao
  FROM turmas.matriculas
  WHERE data_desvinculo IS NULL
)
UPDATE turmas.matriculas AS m
SET data_desvinculo = now()
FROM duplicadas AS d
WHERE m.id = d.id
  AND d.posicao > 1;

CREATE UNIQUE INDEX matriculas_ativa_turma_aluno_key
  ON turmas.matriculas (turma_id, aluno_id)
  WHERE data_desvinculo IS NULL;