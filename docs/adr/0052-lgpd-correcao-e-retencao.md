# ADR-0052: LGPD — pedido de correção de dados e retenção de externos

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A
- **Requisitos relacionados:** RNF05 (LGPD art. 18, III — correção; art. 15/16 — término do tratamento)

## Decisão

- **Correção:** o titular pede em *Minha conta* a correção de **nome** e/ou **matrícula**
  (`solicitacoes_lgpd.tipo = CORRECAO`, valores em `dados_corrigidos`). O administrador aplica na
  conta e **também no nome guardado nas notas**. A auditoria registra só quais campos mudaram (nunca
  os valores). E-mail continua sendo alterado pela administração (é o login).
- **Retenção de externos:** `RETENCAO_EXTERNOS_DIAS` (padrão **0 = desligado** — decisão da
  instituição/DPO). Ligado, uma vez por dia anonimiza nome/e-mail de participantes de prova pública
  cuja aplicação terminou há mais que o prazo (notas permanecem para estatística). Também pode ser
  executado na tela LGPD (*Aplicar agora*). Auditado com as contagens.

## Consequências

- Retenção de alunos com conta continua dependendo da política da instituição (não automatizada).
