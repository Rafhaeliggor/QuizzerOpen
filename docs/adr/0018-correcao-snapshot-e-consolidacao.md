# ADR-0018: Correção com snapshot, consolidação e anulação

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev B
- **Requisitos relacionados:** RF07, RF08, RF11

## Decisão

- **Instância congelada** (RF06): ao iniciar, a ordem das questões/alternativas (embaralhadas
  com gerador criptográfico se a prova é randomizada), o conteúdo e o **gabarito congelado**
  são gravados em `aplicacao.instancias`. O participante nunca recebe gabarito.
- **Correção na mesma transação da finalização**: ao enviar/expirar, a aplicação entrega à
  correção um **snapshot** completo (enunciado, alternativas, gabarito, rubrica, resposta, peso,
  participante, prova). `correcao.notas` + `correcao.correcoes_questao` passam a ser
  autossuficientes — correção, recursos e relatórios não leem tabelas de outros módulos.
- Fechadas: corrigidas automaticamente (1 ou 0). Abertas **em branco**: 0 automático com
  feedback "Questão sem resposta" (não poluem a fila). Abertas respondidas: `fracao = null`
  até o corretor atribuir 0–100%.
- **Consolidação** (RF07): enquanto houver questão (não anulada) sem correção, a nota fica
  `PENDENTE_CORRECAO_MANUAL` com nota provisória; a nota final e a aprovação só existem quando
  tudo foi corrigido. Ao consolidar, o aluno é notificado. Depois de consolidada, mudar nota só
  por **recurso** (a tela de correção bloqueia).
- **Recurso deferido** tem dois efeitos possíveis: ajuste individual (nova fração para aquele
  aluno) ou **anulação** da questão na prova (`correcao.anulacoes`) com política
  `PONTUAR_TODOS` ou `REMOVER_DO_TOTAL`, que **reprocessa todas as notas** que contêm a questão
  e notifica os alunos afetados. Recursos pendentes sobre a mesma questão são resolvidos junto.
  A política "recalcular proporcional" do Inventário de Dados equivale a `REMOVER_DO_TOTAL`
  na fórmula adotada.
- Relatórios consideram a **última tentativa** de cada participante.

## Consequências

- Reprodutível e auditável: a nota pode ser recalculada a partir do snapshot.
- Sugestão de nota por IA continua fora do MVP (plano, Seção 6).
