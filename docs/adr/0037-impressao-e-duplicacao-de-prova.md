# ADR-0037: Impressão/PDF da prova pelo navegador e duplicação de prova

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev C (tela), Dev A (duplicação)
- **Requisitos relacionados:** RF05 ("exportar a prova em PDF com ou sem gabarito")

## Decisão

- **PDF pelo navegador**: a rota `/app/provas/:id/imprimir` monta a prova com CSS de impressão
  (cabeçalho com nome/turma/data, linhas para respostas, quebra de página evitada dentro da questão).
  O professor marca *Incluir gabarito e rubricas* e usa **Imprimir → Salvar como PDF**. Nenhuma
  biblioteca de PDF no servidor.
- **Duplicar** (`POST /provas/:id/duplicar`) cria um **rascunho** com os mesmos parâmetros e a mesma
  composição (mesmas versões das questões), título "(cópia)". Auditado (`PROVA_DUPLICADA`).

## Alternativas consideradas

- **PDF no servidor (Puppeteer/Chromium)** — +300 MB na imagem e mais superfície de ataque; o
  resultado seria o mesmo do navegador.

## Consequências

- O layout final depende do navegador (margens/cabeçalhos do diálogo de impressão).
