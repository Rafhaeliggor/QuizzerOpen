-- Fila de correção manual (status = PENDENTE_CORRECAO_MANUAL, ordenada por fim_em) e cursor da
-- API de integração (status = CONSOLIDADA, ordenada por consolidada_em, id).
CREATE INDEX "notas_status_fim_em_idx" ON "correcao"."notas"("status", "fim_em");
CREATE INDEX "notas_status_consolidada_em_id_idx" ON "correcao"."notas"("status", "consolidada_em", "id");
