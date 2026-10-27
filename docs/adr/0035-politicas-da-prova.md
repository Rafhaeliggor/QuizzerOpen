# ADR-0035: Políticas da prova — gabarito, prazo de recurso e eventos de comportamento

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev A
- **Requisitos relacionados:** RF06 ("registro de eventos relevantes"), RF07, RF08

## Decisão

- **Gabarito para o aluno** (`Prova.exibirGabarito`): `NUNCA` (padrão, comportamento anterior),
  `APOS_CORRECAO` (quando o resultado é consolidado) ou `APOS_ENCERRAMENTO` (consolidado **e** a
  janela da aplicação terminou). A política é **congelada na nota** (`Nota.exibirGabarito`,
  `janelaFim`) ao enviar — mudar a prova depois não altera resultados já gerados. Com gabarito
  visível, o aluno vê a alternativa correta, as respostas aceitas (resposta curta) e a rubrica.
- **Prazo de recurso** (`Prova.prazoRecursoDias`, 1–60 ou sem prazo): conta a partir da
  **consolidação** da nota; também congelado na nota. Fora do prazo: `409 PRAZO_RECURSO_ENCERRADO`
  e o botão some.
- **Eventos de comportamento:** a tela de execução envia `SAIU_DA_PROVA`/`VOLTOU_A_PROVA` no
  `visibilitychange` (troca de aba, outro programa, tela bloqueada). Ficam em
  `aplicacao.eventos_tentativa`, com contador `saidasDeFoco` no acompanhamento e linha do tempo para o
  professor. **Só registro — não bloqueia, não penaliza e não é prova de fraude** (o navegador não
  garante nada; o aluno é avisado na tela). Horário do cliente só é aceito se plausível (até 5 min
  no passado); teto de 500 eventos por tentativa; fora do andamento é ignorado. Sem auditoria
  (volume) — a auditoria continua com início/envio/troca de sessão.

## Consequências

- Detecção de anomalias (RF09) continua 🚫; os eventos são a matéria-prima para quando vier.
