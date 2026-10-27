# ADR-0024: Sessão única por tentativa (assumir em vez de bloquear)

- **Status:** Aceito
- **Data:** 2026-10-10
- **Responsável:** Dev A / Dev C
- **Requisitos relacionados:** RF06 ("sessão única por tentativa"), RNF03

## Decisão

- Ao abrir a prova, o cliente chama `POST …/tentativas/:id/sessao` e recebe um identificador
  aleatório (`sessao_execucao`). Autosave e envio exigem o cabeçalho `X-Sessao-Execucao` igual
  ao vigente; caso contrário, `409 SESSAO_SUBSTITUIDA` — nada é gravado.
- Abrir a prova em **outro dispositivo/aba assume a tentativa** (gera novo identificador) e
  invalida o anterior. A troca **incrementa `trocas_sessao`**, é **auditada**
  (`TENTATIVA_SESSAO_ASSUMIDA`) e aparece para o professor no acompanhamento
  ("aberta em outro dispositivo N×").
- A tela antiga para de salvar (sem reenviar pendências) e oferece "Continuar neste dispositivo".
- Leituras (`GET`) e a varredura de expiração não dependem da sessão. A reabertura administrativa limpa a sessão.

## Alternativas consideradas

- **Bloquear o segundo dispositivo** — impediria o aluno de continuar quando o computador trava
  (cenário comum de laboratório), exigindo intervenção administrativa. Assumir + registrar
  mantém a continuidade e dá ao professor o sinal de integridade.

## Consequências

- Duas abas não conseguem mais gravar respostas em paralelo (evita sobrescrita silenciosa).
- PENDENTE: política configurável por prova (ex.: bloquear trocas em provas de alta criticidade).
