#!/usr/bin/env bash
# Remove do banco da stack Docker os dados criados pelo teste de carga (turmas "Carga …" e
# alunos carga.*@quizzer.local). A trilha de auditoria permanece (é imutável).
set -euo pipefail
cd "$(dirname "$0")/../.."
docker compose exec -T postgres psql -qU quizzer -d quizzer -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;
CREATE TEMP TABLE ap AS SELECT a.id FROM aplicacao.aplicacoes a JOIN turmas.turmas t ON t.id = a.turma_id WHERE t.nome LIKE 'Carga %';
DELETE FROM correcao.notas WHERE aplicacao_id IN (SELECT id FROM ap);
DELETE FROM aplicacao.respostas WHERE tentativa_id IN (SELECT te.id FROM aplicacao.tentativas te JOIN aplicacao.instancias i ON i.id = te.instancia_id WHERE i.aplicacao_id IN (SELECT id FROM ap));
DELETE FROM aplicacao.tentativas WHERE instancia_id IN (SELECT id FROM aplicacao.instancias WHERE aplicacao_id IN (SELECT id FROM ap));
DELETE FROM aplicacao.instancias WHERE aplicacao_id IN (SELECT id FROM ap);
DELETE FROM aplicacao.aplicacoes WHERE id IN (SELECT id FROM ap);
DELETE FROM turmas.turma_professores WHERE turma_id IN (SELECT id FROM turmas.turmas WHERE nome LIKE 'Carga %');
DELETE FROM turmas.matriculas WHERE turma_id IN (SELECT id FROM turmas.turmas WHERE nome LIKE 'Carga %');
DELETE FROM turmas.turmas WHERE nome LIKE 'Carga %';
DELETE FROM notificacoes.notificacoes WHERE usuario_id IN (SELECT id FROM iam.usuarios WHERE email LIKE 'carga.%@quizzer.local');
DELETE FROM iam.sessoes WHERE usuario_id IN (SELECT id FROM iam.usuarios WHERE email LIKE 'carga.%@quizzer.local');
DELETE FROM iam.usuarios WHERE email LIKE 'carga.%@quizzer.local';
COMMIT;
SQL
echo "Dados do teste de carga removidos."
