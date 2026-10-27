# ADR-0045: Indícios para revisão humana nos relatórios

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A
- **Requisitos relacionados:** RF09 ("detecção de anomalias" — 🚫 no plano, versão simples)

## Decisão

Relatório da prova lista **indícios para revisão** (função pura `indicios()`):
- envio em menos de 25% da **mediana** de duração (com 5+ participantes);
- 3+ saídas da aba da prova; 2+ trocas de dispositivo;
- **3+ erros idênticos** em questões fechadas entre dois participantes (erro igual é muito mais raro
  que acerto igual; acertos nunca contam).

A tela diz explicitamente que **não são prova de fraude**. Nada é bloqueado, anulado ou comunicado ao
aluno automaticamente.

## Consequências

- Limiares fixos no código (podem virar configuração). A análise de pares limita-se a 400
  participantes por relatório.
- O "dashboard executivo" e modelos estatísticos continuam fora.
