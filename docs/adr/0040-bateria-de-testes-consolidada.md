# ADR-0040: Bateria de testes consolidada em um único comando

- **Status:** Aceito
- **Data:** 2026-10-11
- **Responsável:** Dev B
- **Requisitos relacionados:** plano, Seção 5 (Definition of Done); pedido do responsável pelo projeto

## Contexto

O responsável pelo projeto pediu para concentrar os testes "em um arquivo à parte" e rodar tudo de
uma vez quando quiser, em vez de execuções pesadas a cada entrega.

## Decisão

- **`testes/testar-tudo.sh`** (também `npm run test:tudo`; `npm run test:rapido` só para estáticos,
  unitários e e2e): etapas `estatico, unitarios, e2e, stack, navegador, carga, backup, monitor, https,
  producao` (esta informativa), seleção por `--etapas`, relatório em
  `testes/resultados/<data-hora>/resumo.md` com um log por etapa, código de saída ≠ 0 se falhar.
- Os testes de infraestrutura ficam em `testes/infra/` e **restauram o estado** (modo TLS, status do
  backup, arquivos temporários); a carga apaga os próprios dados (`testes/carga/limpar-dados-carga.sh`).
- Durante o desenvolvimento rodam-se apenas verificações leves (typecheck, lint, unitários e os e2e
  afetados); a bateria completa fica para o responsável e para o CI.
- Roteiro manual complementar em [`docs/testes/roteiro-de-testes.md`](../testes/roteiro-de-testes.md).
