# ADR-0044: Exportação Excel (.xlsx) própria e impressão de relatórios

- **Status:** Aceito
- **Data:** 2026-10-12
- **Responsável:** Dev A, Dev C
- **Requisitos relacionados:** RF09 ("exportação PDF/Excel"), RF11

## Decisão

- Gerador **.xlsx mínimo no código** (`common/xlsx/xlsx.ts`): uma aba, cabeçalho em negrito e
  congelado, filtro automático, larguras ajustadas, textos como *inline string* (**nunca viram
  fórmula** — sem risco de injeção de fórmula) e números como números. ZIP montado com o `zlib` do
  Node (`crc32` + DEFLATE). Nenhuma dependência nova.
- Rotas `…/provas/:id/{csv|xlsx}`, `…/turmas/:id/{csv|xlsx}` e `/auditoria/{csv|xlsx}`.
- **PDF de relatório** pelo navegador (*Imprimir / PDF*), com CSS de impressão que esconde menus e
  filtros — mesma abordagem da prova (ADR-0037).

## Alternativas consideradas

- **ExcelJS/SheetJS** — muito maiores do que o necessário e mais superfície de cadeia de suprimentos.
