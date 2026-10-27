# 031 — Relatórios em Excel, impressão/PDF e indícios para revisão; uptime e deploy

- **Status:** Concluída (MVP)
- **Sprint:** 8 (lote 7) · **Responsável:** Dev A, Dev B, Dev C
- **Requisitos:** RF09, RF11, RNF03 · **ADRs:** [0044](../adr/0044-exportacao-excel-e-impressao-de-relatorios.md), [0045](../adr/0045-indicios-para-revisao.md), [0046](../adr/0046-uptime-externo-e-deploy-manual.md)

## Casos de uso

| # | Ator | Cenário | Resultado esperado |
|---|---|---|---|
| 1 | Professor | Relatório da prova/turma → *Excel* | Planilha .xlsx com cabeçalho fixo e filtros |
| 2 | Professor | *Imprimir / PDF* | Página sem menus, pronta para "Salvar como PDF" |
| 3 | Professor | Abre relatório com participante que errou igual a outro em 3+ questões | Cartão "Indícios para revisão" com o motivo — e o aviso de que não é prova de fraude |
| 4 | Admin | *Auditoria → Excel* | Até 10 mil eventos com nomes |
| 5 | TI | Define `URL_PRODUCAO` no GitHub | Uptime a cada 15 min de fora do VPS (e certificado) |
| 6 | TI | *Actions → Deploy → DEPLOY* | Checkout do commit com CI verde, rebuild e verificador no VPS |

## Testes

`common/xlsx/xlsx.spec.ts` (estrutura, escape, sem fórmula, `unzip -t`), `agregacao.spec.ts`
(indícios), e2e (download .xlsx, indícios vazios), Playwright (download Excel).

## Pendências e limitações

- [ ] Planilha abre no Excel/LibreOffice — conferir no roteiro manual (não havia Excel no ambiente de teste).
- [ ] Limiares dos indícios configuráveis.
